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
            var controls = new ControlsView();
            controls.$el.appendTo(this.$el);
            controls.render();

            controls.on('pan', this.pan, this);
            controls.on('zoom', this.zoom, this);
            controls.on('reset', this.reset, this);

            this.svg = d3.select(this.el)
                .append('svg')
                .attr('xmlns', 'http://www.w3.org/2000/svg');

            this.vis = this.svg.append("g")
                .attr('id', 'viewport');

            this.resize();

            $(this.svg).svgPan('viewport');
            this.layoutTree = d3.layout.tree()
                .size([180, 1]) // translation is handled by width rather than node depth, so second number doesn't matter
                .separation(_.bind(function (a, b) {
                    return (a.parent === b.parent ? 1 : 2)
                        * (a.height() + b.height())
                        / (Math.log(a.translation()) * Math.pow(b.translation(), 2));
                }, this))
                .children(_.bind(function (node) {
                    return this.collection.getAll(node.visibleChildIds());
                }, this));

            this.collection.on('add change:hidden change:childIds remove',
                               _.debounce(this.refresh, 500), this);

            $(window).resize(_.debounce(_.bind(this.resize, this), 100));
        },

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
                left = 0,
                right = 0,
                top = 0,
                bottom = 0,
                x = 0,
                y = 0,
                svgWidth = this.svg.attr('width'),
                svgHeight = this.svg.attr('height');

            _.each(this.calculateData(), function (node) {
                var t = node.translation() + node.width(),
                    x = Math.cos(node.x + 180) * t,
                    y = Math.sin(node.x + 180) * t;
                left = x < left ? x : left;
                right = x > right ? x : right;
                top = y < top ? y : top;
                bottom = y > bottom ? y : bottom;
            });

            x = svgWidth / (right - left);
            y = svgHeight / (bottom - top);

            ratio = Number(x < y ? x : y).toFixed(3);

            this.vis.transition()
                .duration(200)
                .attr('transform', 'matrix(' + ratio + ',0,0,' + ratio + ',' +
                      ((right * ratio / 2) + (svgWidth / 2)) + ',' +
                      ((bottom  * ratio / 2) + (svgHeight / 2)) + ')');
        },

        /**
         * Manually zoom the svg by the specified amount about the
         * center.  Plays nice with SVG pan, since it works with the
         * viewport.
         *
         * @param inOut Positive to zoom in, negative to zoom out.
         */
        zoom: function (inOut) {
            // todo scale from center
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
                    leftRight ? (leftRight > 0 ? -offset : offset) : 0,
                    upDown    ? (upDown    > 0 ? -offset : offset) : 0
                );
            this.vis.transition()
                .duration(200)
                .attr('transform', 'matrix(' + m.a + ',' + m.b + ',' + m.c + ',' + m.d + ',' + m.e + ',' + m.f + ')');
        },

        draw: function (node, x, y) {
            x = x || this.svg.attr('width') / 2;
            y = y || this.svg.attr('height') / 2;
            this.vis.attr('transform', "matrix(1, 0, 0, 1, " + x + "," + y + ")");
            this.data = this.layoutTree.nodes(node);
            _.each(this.data, function (node) {
                node.x = _.isNaN(node.x) ? 0 : node.x;
            });
        },

        refresh: function () {
            var outer = this.vis.selectAll(".outer")
                    .data(this.data, function (d) { return d.id; }),
                link = this.vis.selectAll("path.link")
                    .data(this.layoutTree.links(this.data), function (d) {
                        return d.source.id + '_' + d.target.id;
                    }),
                inner;

            outer.enter()
                .append('g')
                .classed('outer', true)
                .append('g')
                .classed('inner', true)
                .each(function (node) {
                    // create view for node, so that we know width/height
                    new NodeView({
                        model: node,
                        el: this
                    }).render();
                });

            // regenerate data, since we have renders to allow for separation
            //this.calculateData();

            inner = this.vis.selectAll('.inner');

            outer.transition()
                .duration(1000)
                .attr("transform", function (node) {
                    var translate = node.translation(),
                        angle = node.x + 180;

                    return "rotate(" + angle + ")" +
                        "translate(" + translate + ")";
                });

            inner.transition().attr('transform', function (node) {
                if (node.x < 90 || node.x > 270) {
                    var x = -node.width();
                    return 'rotate(180)translate(' + x + ',0)';
                } else {
                    return '';
                }
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
                .attr('d', function (node, i) {
                    var targetY = node.target.translation(),
                        sourceY = node.source.translation();

                    if (targetY < sourceY) {
                        targetY = targetY + node.target.width();
                    } else {
                        sourceY = sourceY + node.source.width();
                    }

                    return diagonal({
                        source: { x: node.source.x,
                                  y: sourceY },
                        target: { x: node.target.x,
                                  y: targetY }
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

            return this;
        },

        erase: function () {
            this.data = [];
            this.refresh();
        }
    });
});
