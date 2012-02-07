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
 * d3 tree..
 */
define([
    'lib/d3',
    'lib/underscore',
    'lib/backbone',
    'collections/openscrape.nodes',
    'views/openscrape.node'
], function (d3, _, backbone, nodeCollection, NodeView) {
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

    return backbone.View.extend({

        tagName: 'div',
        className: 'visual',

        collection: nodeCollection,

        initialize: function (options) {

            var svg = d3.select(this.el)
                    .append('svg')
                    .attr('xmlns', 'http://www.w3.org/2000/svg')
                    .attr("width", r * 2)
                    .attr("height", r * 2),

                defs = svg.append('defs'),
                dropShadow = newDropShadow(defs)
                    .attr('id', 'dropshadow');

            this.vis = svg.append("g")
                .attr('id', 'viewport')
                .attr("transform", "translate(" + r + "," + r + ")");

            this.tree = d3.layout.tree()
                .size([360, r])
                .separation(function (a, b) {
                    return (a.parent === b.parent ? 1 : 2) / a.depth;
                });

            //this.collection.on('all', this.render, this);
            this.collection.on('sync', this.render, this);
        },

        render: function () {
            var collection = this.collection,

                // The .nodes function generates nested JSON.
                // When we need access to the model itself, use
                // collection.get().
                nodes = this.tree.nodes(this.rootNode)
                    .children(function (d) {
                        return collection.get(d.id).children();
                    }),
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
                .append('div')
                .each(function (d) {
                    // create view for node
                    var v = new NodeView({
                        model: collection.get(d.id),
                        el: this
                    });
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
                .each(function (d) {
                    d.destroy(); // make sure to destroy our model
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
    });
});
