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
    'views/openscrape.node'
], function (d3, _, backbone, NodeView) {
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

        r = 5000; // size of initial visual

    return backbone.View.extend({

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
                })
                .children(_.bind(function (d) {
                    if (!d.hidden) {
                        return _.invoke(this.collection.getAll(d.childIds), 'toJSON');
                    } else {
                        return [];
                    }
                }, this));

            this.collection.on('add', this.render, this);
            this.collection.on('change:hidden', this.render, this);
            this.collection.on('change:childIds', this.render, this);
            this.collection.on('remove', this.render, this);
        },

        collapse: function () {
            var node = this.vis.selectAll('.gNode').data([]),
                link = this.vis.selectAll('path.link').data([]);

            node.exit()
                .transition()
                .duration(1000)
                .attr("transform", function (d) {
                    return 'translate(0)scale(0)';
                })
                .remove();

            link.exit()
                .transition()
                .duration(1000)
                .attr('d', origin)
                .remove();
        },

        /**
         * Redraw this bad boy.  Debounced so that mr. clickety can't
         * sink processors.
         */
        render: _.debounce(function () {
            // The .nodes function generates nested JSON.
            // When we need access to the model itself, use
            var collection = this.collection,
                nodes = _.map(
                    this.tree.nodes(collection.first().toJSON()),
                    // bug in d3? make NaN x values 0.
                    function (node) {
                        if (_.isNaN(node.x)) {
                            node.x = 0;
                        }
                        return node;
                    }
                ),
                link = this.vis.selectAll("path.link")
                    .data(this.tree.links(nodes), function (d) {
                        return d.source.id + '_' + d.target.id;
                    }),
                node = this.vis.selectAll(".gNode")
                    .data(nodes, function (d) {
                        return d.id;
                    }),
                foreign = this.vis.selectAll('.foreign');

            node.enter()
                .append('g')
                .classed('gNode', true)
                .attr('transform', function (d) {
                    // correct orientation upon entry
                    var rotate = d.parent ? d.x - 90 : d.x;
                    return "rotate(" + rotate + ")scale(0)";
                })
                .append('svg:foreignObject')
                .classed('foreign', true)
                .attr('width', function (d) {
                    return NodeView.prototype.iframeWidth;
                })
                .attr('height', function (d) {
                    return NodeView.prototype.iframeHeight;
                })
                .append('xhtml:body')
                .append('div')
                .classed('node', true)
                .each(function (d) {
                    // create view for node
                    var view = new NodeView({
                        model: collection.get(d.id),
                        el: this
                    });
                    view.render();

                    // TODO somewhere less spaghetti to scrape if first addition
                    if (collection.length === 1) {
                        view.scrape();
                    }
                });

            node.transition()
                .duration(1000)
                .attr("transform", function (d) {
                    var model = collection.get(d.id),
                        maxWidth = model.get('maxWidth'),
                        rawWidth = model.get('rawWidth'),
                        translate = model.distance(),

                        // perpendicular root
                        rotate = d.parent ? d.x - 90 : d.x,

                        // scale down to maxWidth
                        scale = rawWidth > maxWidth ? maxWidth / rawWidth : 1;

                    return "rotate(" + rotate + ")" +
                        "translate(" + translate + ")" +
                        "scale(" + scale + ")";
                })
                .select('.foreign')
                .attr('transform', function (d) {
                    var model = collection.get(d.id),
                        x = d.x < 180 ? 0 : -model.get('rawWidth'),
                        y = -model.get('rawHeight') / 2,
                        rotate = d.x < 180 ? 0 : 180;

                    return 'rotate(' + rotate + ')translate(' + x + ',' + y + ')';
                });

            node.exit()
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
                    return diagonal({
                        source: { x: d.source.x,
                                  y: collection.get(d.source.id).distance() },
                        target: { x: d.target.x,
                                  y: collection.get(d.target.id).distance() }
                    }, i);
                });

            link.exit()
                .transition()
                .duration(1000)
                .attr('d', origin)
                .remove();

            // ensure that paths are drawn below nodes through reordering
            this.vis.selectAll('g.gNode,path.link')
                .sort(function (a, b) {
                    // if b has a target, it is a link
                    return (_.has(a, 'target') || _.has(a, 'source')) ? -1 : 0;
                });

            return this;
        }, 500)
    });
});
