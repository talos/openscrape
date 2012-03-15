/***
   * Copyright (c) 2012 John Krauss.
   *
   * This file is part of Openscrape.
   *
   * Openscrape is free software: you can redistribute it and/or modify
   * it under the terms of the GNU General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * Openscrape is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   * GNU General Public License for more details.
   *
   * You should have received a copy of the GNU General Public License
   * along with Openscrape.  If not, see <http://www.gnu.org/licenses/>.
   *
   ***/

/*jslint browser: true, nomen: true*/
/*global define*/

define([
    'require',
    'lib/d3',
    'lib/underscore',
    'lib/backbone',
    'views/openscrape.node',
    'views/openscrape.editor',
    'views/openscrape.controls',
    'lib/jquery',
    'lib/jquery-svgpan'
], function (require, d3, _, backbone, NodeView, EditorView, ControlsView) {
    "use strict";

    var $ = require('jquery'),
        diagonal = d3.svg.diagonal.radial().projection(function (d) {
            return [d.y, d.x / 180 * Math.PI];
        }),
        origin = d3.svg.diagonal.radial().projection(function (d) {
            return [0, 0];
        });

    return backbone.View.extend({

        tagName: 'div',
        id: 'visual',

        events: {
            'click': 'click'
        },

        initialize: function (options) {
            this.controls = new ControlsView();
            this.controls.$el.appendTo(this.$el);
            this.controls.render();

            this.controls.on('pan', this.pan, this);
            this.controls.on('zoom', this.zoom, this);
            this.controls.on('reset', this.reset, this);

            this.debouncedResize = _.debounce(_.bind(this.resize, this), 100);
            this.debouncedRender = _.debounce(this.render, 500);

            $(window).resize(this.debouncedResize);
            this.svg = d3.select(this.el)
                .append('svg')
                .attr('xmlns', 'http://www.w3.org/2000/svg');

            this.vis = this.svg.append("g")
                .attr('id', 'viewport');

            this.preloader = this.svg.append('g')
                .attr('id', 'preloader');

            $(this.svg).svgPan('viewport');
            this.layoutTree = d3.layout.tree()
                .size([180, 1]) // translation is handled by width rather than node depth, so second number doesn't matter
                .separation(_.bind(function (a, b) {
                    var translation = a.translation + b.translation + Math.E;

                    return (a.parent === b.parent ? 1 : 2)
                        * (a.height + b.height)
                    // TODO determine translations
                        / (Math.log(translation) * Math.pow(translation, 2));
                }, this));

            if (this.model) {
                this.setModel(this.model);
            }
        },

        /**
         * Switch which model is observed.
         */
        setModel: function (model) {
            this.model = model;
            this.model.collection.off('change:expanded change:childIds');
            this.model.collection.on('change:expanded change:childIds', this.debouncedRender, this);
        },

        /*remove: function () {
            backbone.View.prototype.remove.call(this);
            this.controls.remove();
            this.model.collection.off('change:expanded change:childIds', this.debouncedRender);
            $(window).unbind('resize', this.debouncedResize);
        },*/

        /**
         * Zoom in on double clicks
         */
        click: function (evt) {
            var timeout = 500;
            if (this.justClicked === true) {
                this.zoom(1);
            } else {
                this.justClicked = true;
                setTimeout(_.bind(function () {
                    this.justClicked = false;
                }, this), timeout);
            }
        },

        /**
         * Make sure that the SVG takes up the entirety of its container.
         */
        resize: function () {
            var width = this.$el.width(),
                height = this.$el.height();

            this.svg.attr('width', width)
                .attr('height', height);
        },

        /**
         * Fit everything into the view.
         */
        reset: function () {
            var ratio = 0,
                x = 0,
                y = 0,
                svgWidth = this.svg.attr('width'),
                svgHeight = this.svg.attr('height');

            this.right = this.right || svgWidth / 2;
            this.left  = this.left  || -svgWidth / 2;
            this.top   = this.top   || -svgHeight / 2;
            this.left  = this.left  || svgHeight / 2;

            x = svgWidth / (this.right - this.left);
            y = svgHeight / (this.bottom - this.top);

            ratio = Number(x < y ? x : y).toFixed(3);

            this.vis.transition()
                .duration(200)
                .attr('transform', 'matrix(' + ratio + ',0,0,' + ratio + ',' +
                      ((this.right * ratio / 2) + (svgWidth / 2)) + ',' +
                      ((this.bottom  * ratio / 2) + (svgHeight / 2)) + ')');
        },

        /**
         * Manually zoom the svg by the specified amount about the
         * center.  Plays nice with SVG pan, since it works with the
         * viewport.
         *
         * @param inOut Positive to zoom in, negative to zoom out.
         */
        zoom: function (inOut) {
            var svg = this.svg[0][0],
                vis = this.vis[0][0],
                ratio = 2,
                center = svg.createSVGPoint(),
                p,
                m;

            center.x = this.svg.attr('width') / 2;
            center.y = this.svg.attr('height') / 2;

            p = center.matrixTransform(vis.getCTM().inverse());

            m = vis.getCTM()
                .multiply(
                    svg.createSVGMatrix()
                        .translate(p.x, p.y)
                        .scale(inOut > 0 ? ratio : 1 / ratio)
                        .translate(-p.x, -p.y)
                );
            this.vis.transition()
                .duration(200)
                .attr('transform', 'matrix(' + m.a + ',' + m.b + ',' + m.c + ',' + m.d + ',' + m.e + ',' + m.f + ')');
        },

        /**
         * Manually pan the svg.
         *
         * @param leftRight Positive to move to the right, negative to move to the left.
         * @param upDown Positive to move down, negative to move up.
         */
        pan: function (leftRight, upDown) {
            var svg = this.svg[0][0],
                vis = this.vis[0][0],
                offset = 150,
                m = vis.getCTM().translate(
                    leftRight === 0 ? 0 : leftRight > 0 ? -offset : offset,
                    upDown    === 0 ? 0 : upDown    > 0 ? -offset : offset
                );
            this.vis.transition()
                .duration(200)
                .attr('transform', 'matrix(' + m.a + ',' + m.b + ',' + m.c + ',' + m.d + ',' + m.e + ',' + m.f + ')');
        },

        /**
         * Force the center of the SVG to a particular x & y.
         *
         * @param {Number} x The x offset, in pixels.
         * @param {Number} y The y offset, in pixels.
         */
        center: function (x, y) {
            this.vis.attr('transform', 'translate(' + x + ',' + y + ')');
        },

        /**
         * Render every node into an invisible SVG so that we know how
         * big they are for scaling purposes.
         */
        preload: function () {
            var nodes = this.preloader
                    .selectAll('.preload')
                    .data(this.model.descendents().concat(this.model), function (node) {
                        return node.id;
                    });

            nodes.enter()
                .append('g')
                .classed('preload', true)
                .each(function (node) {
                    var view = new NodeView({
                        model: node,
                        el: this
                    }).render();
                    view.remove();
                });

            nodes.exit()
                .remove();
        },

        render: function () {
            this.preload();

            var data = _.map(this.layoutTree.nodes(this.model.asTree()), function (d) {
                    // d3's tree assigns NaN x sometimes. This fixes it.
                    d.x = _.isNaN(d.x) ? 0 : d.x;
                    return d;
                }),
                outer = this.vis
                    .selectAll(".outer")
                    .data(data, function (d) { return d.id; }),
                link = this.vis
                    .selectAll("path.link")
                    .data(this.layoutTree.links(data), function (d) {
                        return d.source.id + '_' + d.target.id;
                    }),
                collection = this.model.collection;

            outer.enter()
                .append('g')
                .classed('outer', true)
                .append('g')
                .classed('inner', true)
                .attr('transform', function (d) {
                    if (d.x < 90 || d.x > 270) {
                        return 'rotate(180)translate(' + -d.width + ',0)';
                    } else {
                        return '';
                    }
                })
                .each(function (d) {
                    // create view for node, so that we know width/height
                    new NodeView({
                        model: collection.get(d.id),
                        el: this
                    }).render();
                });

            outer.transition()
                .duration(1000)
                .attr("transform", function (d) {
                    var angle = Number(d.x + 180).toFixed(3);

                    return "rotate(" + angle + ")" +
                        "translate(" + d.translation + ")";
                });

            outer.exit()
                .transition()
                .duration(1000)
                .attr("transform", function (d) {
                    return 'translate(0)scale(0)';
                })
                .remove();

            link.enter()
                .append("path")
                .attr('d', origin)
                .attr("class", "link")
                .attr("transform", "rotate(-90)");

            link.transition()
                .duration(1000)
                .attr('d', function (d, i) {
                    return diagonal({
                        source: { x: d.source.x,
                                  y: d.source.translation + d.source.width },
                        target: { x: d.target.x,
                                  y: d.target.translation }
                    }, i);
                });

            link.exit()
                .transition()
                .duration(1000)
                .attr('d', origin)
                .remove();

            // ensure that paths are drawn below nodes through reordering
            this.vis.selectAll('g.visual,path.link')
                .sort(function (a, b) {
                    // if b has a target, it is a link
                    return (_.has(a, 'target') || _.has(a, 'source')) ? -1 : 0;
                });

            // Recalculate bounds for this render
            this.bottom = this.top = this.left = this.right = 0;
            _.each(data, _.bind(function (node) {
                var t = node.translation + node.width,
                    x = Math.cos(node.x + 180) * t,
                    y = Math.sin(node.x + 180) * t;
                this.left = x < this.left ? x : this.left;
                this.right = x > this.right ? x : this.right;
                this.top = y < this.top ? y : this.top;
                this.bottom = y > this.bottom ? y : this.bottom;
            }, this));

            return this;
        }
    });
});
