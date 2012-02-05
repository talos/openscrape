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
    './openscrape.request',
    './openscrape.visual',
    'lib/d3',
    'lib/jquery',
    'lib/underscore',
    'lib/json2'
], function (request, visual, d3, $, _, JSON) {
    "use strict";

    /**
     * Generate a drop shadow filter definition.
     *
     * @param defs The definitions to which the filter should be attached.
     *
     * @return A filter definition.
     */
    var newDropShadow = function (defs) {
        var filter = defs.append('filter')
                .attr('height', '130%'),

            blur = filter.append('feGaussianBlur')
                .attr('in', 'SourceAlpha')
                .attr('stdDeviation', '3'),

            offset = filter.append('feOffset')
                .attr('dx', '2')
                .attr('dy', '2')
                .attr('result', 'offsetblur'),

            merge = filter.append('feMerge'),
            node1 = merge.append('feMergeNode'),
            node2 = merge.append('feMergeNode')
                .attr('in', 'SourceGraphic');

        return filter;
    },

        diagonal = d3.svg.diagonal.radial().projection(function (d) {
            return [d.y, d.x / 180 * Math.PI];
        }),

        origin = d3.svg.diagonal.radial().projection(function (d) {
            return [0, 0];
        });

    return (function () {
        /**
         * Initialize openscrape visuals.
         *
         * @param r The radius of svg illustrations.
         */
        function Visual(r) {
            var el = document.createElement('div'),
                svg = d3.select(el).append('svg')
                    .attr('xmlns', 'http://www.w3.org/2000/svg')
                    .attr("width", r * 2)
                    .attr("height", r * 2),

                defs = svg.append('defs'),
                dropShadow = newDropShadow(defs)
                    .attr('id', 'dropshadow');

            this.svg = svg[0][0];

            this.vis = svg.append("g")
                .attr('id', 'viewport')
                .attr("transform", "translate(" + r + "," + r + ")");

            this.tree = d3.layout.tree()
                .size([360, r])
                .separation(function (a, b) {
                    return (a.parent === b.parent ? 1 : 2) / a.depth;
                });

            this.response = null;

            this.getSVG = _.bind(this.getSVG, this);
            this.destroy = _.bind(this.destroy, this);
            this.setResponse = _.bind(this.setResponse, this);
            this.render = _.bind(this.render, this);
        }

        /**
         * Retrieve the visual's SVG element.
         *
         * @return {SVGElement} containing the visual.
         */
        Visual.prototype.getSVG = function (el) {
            return this.svg;
        };

        /**
         * Destroy the openscrape visual.
         *
         * @return {Promise} A Promise that will be resolved when the visual is
         * destroyed.
         */
        Visual.prototype.destroy = function () {
            this.response = null;
            this.render();
            var dfd = new $.Deferred();
            setTimeout(function () { dfd.resolve(); }, 1000);

            return dfd.promise();
        };

        /**
         * Switch which response the visual is displaying.
         *
         * @param response {openscrape.Response} The root of
         * the visual.
         *
         * @return {Visual} this
         */
        Visual.prototype.setResponse = function (response) {
            this.response = response;
            return this;
        };

        /**
         * Redraw.
         **/
        Visual.prototype.render = function () {
            var nodes = this.tree.nodes(this.response || {}),
                link = this.vis.selectAll("path.link")
                    .data(this.tree.links(nodes), function (d) {
                        return d.source.id + '_' + d.target.id;
                    }),
                node = this.vis.selectAll(".node")
                    .data(nodes, function (d) {
                        return d.id;
                    });

            if (this.response) {
                node.enter()
                    .append('g')
                    .classed('node', true)
                    .attr('transform', function (d) {
                        return "rotate(" + (d.x - 90) + ")";
                    })
                    .append('svg:foreignObject')
                    .classed('foreign', true)
                    // .attr('transform', function (d) {
                    //     return d.x < 180 ? null : "rotate(180)";
                    // })
                    .attr('height', '1000')
                    .attr('width', '1000')
                    .append('xhtml:body')
                    .each(function (d) {
                        // todo more elegant -- d.el doesn't gain parent otherwise
                        var $el = $(d.el).appendTo($(this));
                        d.el = $el[0];

                        // $el.bind('click', function () {
                        //     console.log(d);
                        //     console.log(d.distance());
                        //     console.log(d.parent.distance());
                        // });
                    });
            }

            node.transition()
                .duration(1000)
                .attr("transform", function (d) {
                    var rotate = d.parent ? d.x - 90 : d.x, // perpendicular root
                        translate = d.parent ? d.parent.distance() : 0,
                        scale = 1;

                    return "rotate(" + rotate + ")" +
                        "translate(" + translate + ")" +
                        "scale(" + scale + ")";
                })
                .select('.foreign')
                .attr('transform', function (d) {
                    var $el = $(d.el),
                        y = $el.html() ? -$el.height() / 2 : 0,
                        x = d.x < 180 ? 0 : ($el.html() ? -$el.width() : 0),
                        rotate = d.x < 180 ? 0 : 180;

                    return 'rotate(' + rotate + ')translate(' + x + ',' + y + ')';
                });

            node.exit()
                .transition()
                .duration(1000)
                .attr("transform", function (d) {
                    return "rotate(0)translate(0)";
                })
                .remove();

            link.enter()
                .append("path")
                .attr('d', origin)
                .attr("class", "link");

            link.transition()
                .duration(1000)
                .attr("d", function (d, i) {
                    return diagonal({
                        source: { x: d.source.x,
                                  y: d.source.parent ? d.source.parent.distance() : 0},
                        target: { x: d.target.x,
                                  y: d.target.parent ? d.target.parent.distance() : 0}
                    }, i);
                });

            link.exit()
                .transition()
                .duration(1000)
                .attr('d', origin)
                .remove();

            // ensure that paths are drawn below nodes
            this.vis.selectAll('g.node,path.link')
                .sort(function (a, b) {
                    // if b has a target, it is a link
                    return (_.has(a, 'target') || _.has(a, 'source')) ? -1 : 0;
                });
        };

        return Visual;
    }());
});

        /**
         * Stop an event from propagating further.
         *
         * @param evt the Event to stop.
         */
        // stopEvent = function (evt) {
        //     if (evt.stopPropagation) {
        //         evt.stopPropagation();
        //     } else {
        //         evt.cancelBubble = true;
        //     }
        // },

        // hypotenuse = function (x1, x2, y1, y2) {
        //     return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        // },

        /**
         * Calculate the distance of the event from x and y.
         *
         * @param evt The event
         * @param x A pixel x value
         * @param y A pixel y value
         *
         * @return The distance of the pointer from x and y.
         */
        // calcDist = function (evt, x, y) {
        //     return hypotenuse(evt.pageX, x, evt.pageY, y);
        // },
