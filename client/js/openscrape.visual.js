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

var openscrape;

openscrape || (openscrape={}); // Define openscrape if not yet defined

(function() {
    /**
       Create an openscrape visual.

       @param g An SVG <g> element to use as the root.
       @param id The root data ID to use when drawing the visual.
       @param x The x coordinate where to place the root node.
       @param y The y coordinate where to place the root node.
       @param r The radius of the resulting tree.
    **/
    openscrape.visualize = function(g, id, x, y, r) {

        var vis = g.append("g")
            .attr('id', 'viewport')
            .attr("transform", "translate(" + x + "," + y + ")");

        var tree = d3.layout.tree()
            .size([360, r - 120])
            .separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; })
            .children(function(d) {
                if(d.hasOwnProperty('childIds')) {
                    // Otherwise it is a child node, its children need to be
                    // expanded from IDs into responses.
                    return _.map(d.childIds, function(childId) {
                        return openscrape.data.getResponse(childId);
                    });
                } else {
                    // This is a response. Its children
                    // are child nodes that can be returned directly.
                    return d.children;
                }
            }),

        diagonal = d3.svg.diagonal.radial()
            .projection(function(d) { return [d.y, d.x / 180 * Math.PI]; });

        origin = d3.svg.diagonal.radial()
            .projection(function(d) { return [0, 0]; }),

        onClick = function(d, i) {
            var elem = d3.select(d3.event.target); // should be 'this', but this also works

            // force request on waits or missings
            if(d.status === 'wait' || d.status === 'missing') {
                var oldFill = elem.style('fill'),
                grow = elem.select('animate'),
                // make it glow while loading
                glow = elem.append('animate')
                    .attr('attributeType', 'CSS')
                    .attr('attributeName', 'fill')
                    .attr('values', '#fff;#f00;#fff')
                    .attr('repeatCount', 'indefinite')
                    .attr('dur', '2s')
                    .attr('begin', '0s'),
                oldGrowValues = grow.attr('values');

                grow.attr('values', '8;16;8'); // modify existing animation

                openscrape.request(d.id, d.instruction, true, d.uri).done(function(resp) {
                    grow.attr('values', oldGrowValues); // restore old animation values
                    elem.style('fill', oldFill);

                    // elem.classed('wait', false);
                    // elem.classed('loaded', true);

                    glow.remove();
                    _.extend(d, resp);
                    openscrape.data.saveResponse(d.id, resp);
                    redraw();
                });
            } else if(d.status === 'loaded') {
                d.children = [];
                d.status = 'wait';

                // elem.classed('loaded', false);
                // elem.classed('wait', true);

                openscrape.data.saveResponse(d.id, d);
                redraw();
            }
        },

        /**
           Called on a node when its circle is hovered over.

           @param d Data associated with node.
           @param i Index of node.
        **/
        onMouseover = function(d, i) {
            if(d.hasOwnProperty('name')) {
                openscrape.mouse.setHTML(d.name);
            } else if(d.status === 'missing') {
                openscrape.mouse.setText(JSON.stringify(d.missing));
            } else if(d.status === 'failed') {
                openscrape.mouse.setText(JSON.stringify(d.failed));
            } else {
                return;  // don't show mouseover
            }
            openscrape.mouse.show();
        },

        /**
           Called on a node when its circle is no longer hovered over.

           @param d Data associated with node.
           @param i Index of node.
        **/
        onMouseout = function(d, i) {
            openscrape.mouse.hide();
        },

        /**
           Redraw the visual.
        **/
        redraw = function() {

            var nodes = tree.nodes(openscrape.data.getResponse(id));

            var link = vis.selectAll("path.link")
                .data(tree.links(nodes), function(d) {
                    return d.source.id + '_' + d.target.id;
                });

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

            var node = vis.selectAll("g.node")
                .data(nodes, function(d) {
                    return d.id;
                });

            var nodeG = node.enter()
                .append("g")
                .attr("class", function(d) {
                    if(d.hasOwnProperty('status')) {
                        return "node " + d.status;
                    } else {
                        return "branch node";
                    }
                });

            // Append circles to all nodes
            // Append event handlers to circles
            nodeG.append("circle")
                .attr("r", 4.5)
                .on("click", function(d, i) { onClick(d, i); })
                .on("mouseover",  function(d, i) { onMouseover(d, i); })
                .on("mouseout",  function(d, i) { onMouseout(d, i); });

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
                .attr("dx", function(d) { return d.x < 180 ? 8 : -8; })
                .attr("dy", ".31em")
                .attr("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
                .attr("transform", function(d) { return d.x < 180 ? null : "rotate(180)"; })
                .text(function(d) {
                    if(d.hasOwnProperty('name')) {
                        if(d.name.length < 20) {
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
                .attr("transform", function(d) {
                    return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")";
                });

            node.exit()
                .transition()
                .duration(1000)
                .attr("transform", function(d) {
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
        }

        redraw();
    };
})();