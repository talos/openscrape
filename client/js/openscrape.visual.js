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

/*global define*/

define([
    './openscrape.data',
    './openscrape.mouse',
    './openscrape.request',
    './openscrape.visual',
    'lib/d3',
    'lib/jquery',
    'lib/underscore',
    'lib/json2'
], function (data, mouse, request, visual, d3, $, underscore, JSON) {
    "use strict";

    var initialRadius,

        /**
         * Stop an event from propagating further.
         *
         * @param evt the Event to stop.
         */
        stopEvent = function (evt) {
            if (evt.stopPropagation) {
                evt.stopPropagation();
            } else {
                evt.cancelBubble = true;
            }
        },

        hypotenuse = function (x1, x2, y1, y2) {
            return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        },

        /**
         * Calculate the distance of the event from x and y.
         *
         * @param evt The event
         * @param x A pixel x value
         * @param y A pixel y value
         *
         * @return The distance of the pointer from x and y.
         */
        calcDist = function (evt, x, y) {
            return hypotenuse(evt.pageX, x, evt.pageY, y);
        },

        /**
         * Generate a drop shadow filter definition.
         *
         * @param defs The definitions to which the filter should be attached.
         *
         * @return A filter definition.
         */
        newDropShadow = function (defs) {
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
        };

    return {

        /**
         * Initialize openscrape visuals.
         *
         * @param r The radius of svg illustrations.
         */
        init: function (r) {
            initialRadius = r;
        },

        /**
         * Draw an openscrape visual.
         *
         * @param id The visual's root data ID.
         *
         * @return A DOM element containing an openscrape visual.
         **/
        draw: function (id) {
            // Set up our svg inside a temporary jQuery container
            var $container = $('<div />'),
                svg = d3.select($container[0]).append('svg')
                    .attr("width", initialRadius * 2)
                    .attr("height", initialRadius * 2),

                defs = svg.append('defs'),
                dropShadow = newDropShadow(defs)
                    .attr('id', 'dropshadow'),

                vis = svg.append("g")
                    .attr('id', 'viewport')
                    .attr("transform", "translate(" + initialRadius + "," + initialRadius + ")"),


                redraw, // defined as function later on

                tree = d3.layout.tree()
                    .size([360, initialRadius - 120])
                    .separation(function (a, b) { return (a.parent === b.parent ? 1 : 2) / a.depth; })
                    .children(function (d) {
                        if (d.hasOwnProperty('childIds')) {
                            // Otherwise it is a child node, its children need to be
                            // expanded from IDs into responses.
                            return underscore.map(d.childIds, function (childId) {
                                return data.getResponse(childId);
                            });
                        } else {
                            // This is a response. Its children
                            // are child nodes that can be returned directly.
                            return d.children;
                        }
                    }),

                diagonal = d3.svg.diagonal.radial()
                    .projection(function (d) { return [d.y, d.x / 180 * Math.PI]; }),

                origin = d3.svg.diagonal.radial()
                    .projection(function (d) { return [0, 0]; }),

                bgCircle = vis.append('circle')
                    .attr('r', initialRadius)
                    .classed('background', true)
                    .on('mousedown', function (d, i) {
                        var evt = d3.event,
                            offset = $container.offset(),
                            left = offset.left,
                            top = offset.top,
                            rescaled = $container.data('rescale'),
                            curRadius = rescaled ?
                                    hypotenuse(0, rescaled.width / 2, 0, rescaled.height / 2) :
                                    initialRadius,
                            curDist = calcDist(evt, left + curRadius, top + curRadius);

                        if (curDist > curRadius - 10) { // 10 pixel live zone
                            stopEvent(d3.event);
                            $container.bind('mousemove.openscrape', function (evt) {
                                var dist = calcDist(evt, left + curRadius, top + curRadius);
                                $container.rescale(dist * 2, dist * 2);
                            });
                        }
                    }).on('mouseup', function (d, i) {
                        $container.unbind('mousemove.openscrape');
                    }).on('mouseleave', function (d, i) {
                        $container.unbind('mousemove.openscrape');
                    }).on('mouseout', function (d, i) {
                        $container.unbind('mousemove.openscrape');
                    }).on('click', function (d, i) {
                        // absorb click so it doesn't go through to map
                        stopEvent(d3.event);
                    }),

                onClick = function (d, i) {
                    var evt = d3.event,
                        elem = d3.select(evt.target), // should be 'this', but this also works
                        oldFill,
                        grow,
                        glow,
                        oldGrowValues;

                    stopEvent(evt);

                    // force request on waits or missings
                    if (d.status === 'wait' || d.status === 'missing') {
                        oldFill = elem.style('fill');
                        grow = elem.select('animate');
                        // make it glow while loading
                        glow = elem.append('animate')
                            .attr('attributeType', 'CSS')
                            .attr('attributeName', 'fill')
                            .attr('values', '#fff;#f00;#fff')
                            .attr('repeatCount', 'indefinite')
                            .attr('dur', '2s')
                            .attr('begin', '0s');
                        oldGrowValues = grow.attr('values');

                        grow.attr('values', '8;16;8'); // modify existing animation

                        request(d.id, d.instruction, true, d.uri)
                            .done(function (resp) {
                                grow.attr('values', oldGrowValues); // restore old animation values
                                elem.style('fill', oldFill);

                                // elem.classed('wait', false);
                                // elem.classed('loaded', true);

                                glow.remove();
                                underscore.extend(d, resp);
                                data.saveResponse(d.id, resp);
                                redraw();
                            });
                    } else if (d.status === 'loaded') {
                        d.children = [];
                        d.status = 'wait';

                        // elem.classed('loaded', false);
                        // elem.classed('wait', true);

                        data.saveResponse(d.id, d);
                        redraw();
                    }
                },

                /**
                 Called on a node when its circle is hovered over.

                 @param d Data associated with node.
                 @param i Index of node.
                 **/
                onMouseover = function (d, i) {
                    if (d.hasOwnProperty('name')) {
                        mouse.setHTML(d.name);
                    } else if (d.status === 'missing') {
                        mouse.setText(JSON.stringify(d.missing));
                    } else if (d.status === 'failed') {
                        mouse.setText(JSON.stringify(d.failed));
                    } else {
                        return;  // don't show mouseover
                    }
                    mouse.show();
                },

                /**
                 Called on a node when its circle is no longer hovered over.

                 @param d Data associated with node.
                 @param i Index of node.
                 **/
                onMouseout = function (d, i) {
                    mouse.hide();
                };

            /**
             Redraw the visual.
             **/
            redraw = function () {

                var nodes = tree.nodes(data.getResponse(id)),

                    link = vis.selectAll("path.link")
                        .data(tree.links(nodes), function (d) {
                            return d.source.id + '_' + d.target.id;
                        }),
                    node,
                    nodeG;

                link.enter()
                    .append("path")
                // .attr('d', d3.svg.diagonal.radial()
                //       .projection(function(d) { return [0,0]; }))
                    .attr('d', origin)
                    .attr("class", "link");
                //.attr("d", diagonal);

                link.transition()
                    .duration(1000)
                    .attr("d", diagonal);

                node = vis.selectAll("g.node")
                    .data(nodes, function (d) {
                        return d.id;
                    });

                nodeG = node.enter()
                    .append("g")
                    .attr("class", function (d) {
                        if (d.hasOwnProperty('status')) {
                            return "node " + d.status;
                        } else {
                            return "branch node";
                        }
                    });

                // Append circles to all nodes
                // Append event handlers to circles
                nodeG.append("circle")
                    .attr("r", 4.5)
                    .on("click", onClick)
                    .on("mouseover", onMouseover)
                    .on("mouseout", onMouseout);

                // Larger circles with click listener for wait nodes
                nodeG.selectAll('.wait circle,.missing circle')
                    .append('animate')         // animation for wait nodes
                    .attr('attributeType', 'XML')
                    .attr('attributeName', 'r')
                    .attr('values', '5;8;5')
                    .attr('repeatCount', 'indefinite')
                    .attr('dur', '2s')
                    .attr('begin', '0s');

                nodeG.append("text")
                    .attr("dx", function (d) { return d.x < 180 ? 8 : -8; })
                    .attr("dy", ".31em")
                    .attr("text-anchor", function (d) { return d.x < 180 ? "start" : "end"; })
                    .attr("transform", function (d) { return d.x < 180 ? null : "rotate(180)"; })
                    .text(function (d) {
                        if (d.hasOwnProperty('name')) {
                            if (d.name.length < 20) {
                                return d.name;
                            } else {
                                return d.name.substr(0, 17) + '...';
                            }
                        } else {
                            return '???';
                        }
                    });

                node.transition()
                    .duration(1000)
                    .attr("transform", function (d) {
                        return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")";
                    });

                node.exit()
                    .transition()
                    .duration(1000)
                    .attr("transform", function (d) {
                        return "rotate(0)translate(0)";
                    })
                //.attr('d', origin)
                // .attr("transform", function(d) {
                //     return "transform(1000)";
                // })
                    .remove();

                link.exit()
                    .transition()
                    .duration(1000)
                    .attr('d', origin)
                // .attr("transform", function(d) {
                //     return "scale(1000)";
                // })
                    .remove();
            };

            //svg.svgPan('viewport');
            redraw();
            return $container[0];
        }
    };
});