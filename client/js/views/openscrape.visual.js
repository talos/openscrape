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

/**
 * A visual is a view that displays the entire tree of nodes inside a
 * d3 tree on the map.
 */
define([
    'lib/google',
    'lib/google.rich-marker',
    'lib/d3',
    'lib/underscore',
    'lib/backbone'
], function (google, rich_marker, d3, _, backbone) {
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
        }),

        r = 300; // size of initial visual

    return new backbone.View.extend({

        initialize: function (options) {

            var marker = new rich_marker.RichMarker({
                map: mapModel.get('gMap'), // TODO binds us to google maps!!
                visible: false,
                flat: true,
                position: new google.maps.LatLng(mapModel.get('lat', mapModel.get('lng'))),
                anchor: rich_marker.RichMarkerPosition.MIDDLE,
                content: this.make('div', 'visual')
            }),

            svg = d3.select(this.el.getContent())
                    .append('svg')
                    .attr('xmlns', 'http://www.w3.org/2000/svg')
                    .attr("width", r * 2)
                    .attr("height", r * 2),

                defs = svg.append('defs'),
                dropShadow = newDropShadow(defs)
                    .attr('id', 'dropshadow');

            this.$content = this.$(this.el.getContent());

            this.vis = svg.append("g")
                .attr('id', 'viewport')
                .attr("transform", "translate(" + r + "," + r + ")");

            this.tree = d3.layout.tree()
                .size([360, r])
                .separation(function (a, b) {
                    return (a.parent === b.parent ? 1 : 2) / a.depth;
                });

            this.collection.bind('all', this.render, this);
        },

        /**
         * Rescale the content.
         */
        rescale: function (scale) {
            var cssScale = 'scale(' + scale + ',' + scale + ')',
                cssOrigin = '(50, 100)',
                properties = [
                    [ 'transform', 'transform-origin' ],
                    [ '-ms-transform', '-ms-transform-origin'], /* IE 9 */
                    [ '-webkit-transform', '-webkit-transform-origin'],/* Safari and Chrome */
                    [ '-o-transform', '-o-transform-origin'], /* Opera */
                    [ '-moz-transform', '-moz-transform-origin' ] /* Firefox */
                ];

            this.$content.css(_.reduce(properties, function (memo, prop) {
                memo[prop[0]] = cssScale;
                memo[prop[1]] = cssOrigin;
                return memo;
            }, {}));
        },

        render: function () {
            var nodes = this.tree.nodes(this.collection),
                link = this.vis.selectAll("path.link")
                    .data(this.tree.links(nodes), function (d) {
                        return d.source.id + '_' + d.target.id;
                    }),
                node = this.vis.selectAll(".node")
                    .data(nodes, function (d) {
                        return d.id;
                    });

            node.enter()
                .append('g')
                .classed('node', true)
                .attr('transform', function (d) {
                    return "rotate(" + (d.x - 90) + ")";
                })
                .append('svg:foreignObject')
                .classed('foreign', true)
                .attr('height', '1000')
                .attr('width', '1000')
                .append('xhtml:body')
                .each(function (d) {
                    d.el.appendTo(this);
                });

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
                    var y = d.el.html() ? -d.el.height() / 2 : 0,
                        x = d.x < 180 ? 0 : (d.el.html() ? -d.el.width() : 0),
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
        }

    })();
});
