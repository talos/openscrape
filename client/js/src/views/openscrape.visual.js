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
    'lib/jquery',
    'lib/jquery-svgpan'
], function (require, d3, _, backbone, NodeView) {
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
            var x = options.x,
                y = options.y;

            this.svg = d3.select(this.el)
                .append('svg')
                .attr('xmlns', 'http://www.w3.org/2000/svg');

            this.vis = this.svg.append("g")
                .attr('id', 'viewport');

            this.resize();

            $(this.svg).svgPan('viewport');
            this.vis.attr('transform', "matrix(1, 0, 0, 1, " + x + "," + y + ")");
            this.tree = d3.layout.tree()
                .size([360, 100]) // translation is handled manually, second number doesn't matter
                .separation(_.bind(function (a, b) {
                    var model1 = this.collection.get(a.id),
                        model2 = this.collection.get(b.id),
                        translation1 = model1.translation(),
                        translation2 = model2.translation(),
                        height1 = model1.height() || 0,
                        height2 = model2.height() || 0;

                    return (a.parent === b.parent ? 1 : 2)
                        * (height1 + height2)
                        / (Math.log(translation1) * Math.pow(translation1, 2));
                        /// Math.pow(translation1 + translation2, 3);
                    // return (a.parent === b.parent ? 1 : 2)
                    //     * ((height1 / translation1) + (height2 / translation2))
                    //     / a.depth;
                }, this))
                .children(_.bind(function (d) {
                    if (!d.hidden) {
                        return _.invoke(this.collection.getAll(d.childIds), 'toJSON');
                    } else {
                        return [];
                    }
                }, this));

            this.collection.on('add change:hidden change:childIds remove',
                               _.debounce(this.render, 500), this);

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
         * Manually pan the svg .
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
                    // .multiply(svg.createSVGMatrix().translate(
                    //     leftRight ? (leftRight > 0 ? -offset : offset) : 0,
                    //     upDown    ? (upDown    > 0 ? -offset : offset) : 0
                    // ));
            this.vis.transition()
                .duration(200)
                .attr('transform', 'matrix(' + m.a + ',' + m.b + ',' + m.c + ',' + m.d + ',' + m.e + ',' + m.f + ')');
        },

        render: function () {
            this.resize();

            // The .nodes function generates nested JSON.
            // When we need access to models, use collection.get()
            var collection = this.collection,
                processed = this.model ? _.map(
                    this.tree.nodes(this.model.toJSON()),
                    // bug in d3? make NaN x values 0.
                    function (node) {
                        if (_.isNaN(node.x)) {
                            node.x = 0;
                        }
                        return node;
                    }
                ) : [],
                link = this.vis.selectAll("path.link")
                    .data(this.tree.links(processed), function (d) {
                        return d.source.id + '_' + d.target.id;
                    }),
                treeNode = this.vis.selectAll(".visual")
                    .data(processed, function (d) {
                        return d.id;
                    });

            treeNode.enter()
                .append('g')
                .classed('visual', true)
                // .attr('transform', function (d) {
                //     // correct orientation upon entry
                //     var model = collection.get(d.id),
                //         rotate = model.x() - 90;
                //     //var rotate = d.x - 90;
                //     return "rotate(" + rotate + ")scale(0)";
                // })
                .each(function (d) {
                    // create view for node
                    new NodeView({
                        model: collection.get(d.id),
                        el: this
                    }).render();
                });

            // TODO draw initial array without calculating nodes or links
            // recalculate tree now that we have rendered heights.
            processed = this.model ? _.map(
                this.tree.nodes(this.model.toJSON()),
                // bug in d3? make NaN x values 0.
                function (node) {
                    if (_.isNaN(node.x)) {
                        node.x = 0;
                    }
                    return node;
                }
            ) : [];
            link = this.vis.selectAll("path.link")
                .data(this.tree.links(processed), function (d) {
                    return d.source.id + '_' + d.target.id;
                });
            treeNode = this.vis.selectAll(".visual")
                .data(processed, function (d) {
                    return d.id;
                });

            treeNode.transition()
                .duration(1000)
                .attr("transform", function (d) {
                    var model = collection.get(d.id),
                        translate = model.translation(),
                        //rotate = model.x() - 90;
                        rotate = d.x - 90;

                    return "rotate(" + rotate + ")" +
                        "translate(" + translate + ")";
                });

            treeNode.exit()
                .transition()
                .duration(1000)
                .attr("transform", function (d) {
                    return 'translate(0)scale(0)';
                })
                .remove();

            link.enter()
                .append("path")
                .attr('d', origin)
                .attr("class", "link");

            link.transition()
                .duration(1000)
                .attr('d', function (d, i) {
                    var target = collection.get(d.target.id),
                        source = collection.get(d.source.id),
                        // targetX = target.x(),
                        // sourceX = source.x(),
                        targetY = target.translation(),
                        sourceY = source.translation();

                    if (targetY < sourceY) {
                        targetY = targetY + target.width();
                    } else {
                        sourceY = sourceY + source.width();
                    }

                    return diagonal({
                        source: { x: d.source.x,
                        //source: { x: sourceX,
                                  y: sourceY },
                        target: { x: d.target.x,
                        // target: { x: targetX,
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
            this.model = null;
            this.render();
        },

        remove: function () {
            this.erase();
            _.delay(_.bind(function () {
                backbone.View.prototype.remove.call(this);
            }, this), 1000);
        }
    });
});
