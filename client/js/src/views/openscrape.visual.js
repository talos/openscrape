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

    var diagonal = d3.svg.diagonal.radial().projection(function (d) {
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
                    .attr("height", r * 2);

            this.vis = svg.append("g")
                .classed('viewport', true)
                .attr("transform", "translate(" + r + "," + r + ")");

            this.tree = d3.layout.tree()
                .size([360, r])
                .separation(function (a, b) {
                    return (a.parent === b.parent ? 1 : 2) / (a.depth * 3);
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
            var node = this.vis.selectAll('.visual').data([]),
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
                node = this.vis.selectAll(".visual")
                    .data(nodes, function (d) {
                        return d.id;
                    });

            node.enter()
                .append('g')
                .classed('visual', true)
                .attr('transform', function (d) {
                    // correct orientation upon entry
                    var rotate = d.x - 90;
                    return "rotate(" + rotate + ")scale(0)";
                })
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
                        translate = model.distance(),
                        rotate = d.x - 90;

                    return "rotate(" + rotate + ")" +
                        "translate(" + translate + ")";
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
                    var target = collection.get(d.target.id),
                        source = collection.get(d.source.id),
                        targetStart = target.start(),
                        sourceStart = source.start();

                    if (targetStart < sourceStart) {
                        targetStart = targetStart + target.get('width');
                    } else {
                        sourceStart = sourceStart + source.get('width');
                    }

                    return diagonal({
                        source: { x: d.source.x,
                                  y: sourceStart },
                        target: { x: d.target.x,
                                  y: targetStart }
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
        }, 500)
    });
});
