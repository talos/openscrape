/**
   Depends upon jQuery (1.7.1), Underscore (1.2.4), d3 core, d3
   layout, and json2.

   Licensed under the GNU GPL v3.
**/


/**
   jQuery plugin to arbitrarly CSS transform-scale elements to a specific size.
   Depends upon Underscore.js.
**/
(function($) {
    var transforms = [
        'transform',
        '-ms-transform', /* IE 9 */
        '-webkit-transform', /* Safari and Chrome */
        '-o-transform', /* Opera */
        '-moz-transform' /* Firefox */
    ],
    transformOrigins = [
        'transform-origin',
        '-ms-transform-origin', /* IE 9 */
        '-webkit-transform-origin', /* Safari and Chrome */
        '-o-transform-origin', /* Opera */
        '-moz-transform-origin' /* Firefox */
    ],
    properties = _.zip(transforms, transformOrigins),

    /**
       Construct a JS object hash that can be applied as CSS to do
       transform and transform-origin value across browsers.

       @param transform the value for the transform CSS property.
       @param transformOrigin the value for the transform-origin CSS
       property.

       @return A JS object that can be applied as CSS.
    **/
    buildCSS = function(transform, transformOrigin) {
        return _.reduce(properties, function(memo, prop) {
            memo[prop[0]] = transform;
            memo[prop[1]] = transformOrigin;
            return memo;
        }, {});
    };
    /**
       Scale an element to a specific width and height.

       @param w The width to scale to.  Required.
       @param h The height to scale to.  Required.
       @param distort Whether to allow differing x and y scale
       factors.  Is true by default, meaning the element could be
       distorted.  If false, the smallest of the two scales will be
       used for both axes, so that neither w or h is ever exceeded.
       @param scaleDirection If negative, only scaling down will be
       allowed.  If greater than 0, only scaling up will be allowed.
       Otherwise, either direction is allowed.  Defaults to 0.
    **/
    $.fn.scale = function(w, h, distort, scaleDirection) {
        if(_.isUndefined(w) || _.isUndefined(h)) { return this; }
        return $.each(this, function(i, el) {
            var $el = $(el),
            xScale = w / $el.width(),
            yScale = h / $el.height();

            if(scaleDirection > 0) { // allow scaling only up
                xScale = xScale < 1 ? 1 : xScale;
                yScale = yScale < 1 ? 1 : yScale;
            } else if(scaleDirection < 0) { // allow scaling only down
                xScale = xScale > 1 ? 1 : xScale;
                yScale = yScale > 1 ? 1 : yScale;
            }

            if(distort === false) {
                if(xScale > yScale) {
                    xScale = yScale;
                } else {
                    yScale = xScale;
                }
            }

            $el.css(buildCSS('scale(' + xScale + ',' + yScale + ')', '0 0'));
        });
    };
})(jQuery);

/**
   protective brackets
**/

(function(){

    /**
       UTIL FUNCTIONS
    **/

    /**
       Convert stylesheet to text.

       @param stylesheet the CSSStyleSheet to convert to text.

       @return The stylesheet as text.
    **/
    var css2txt = function(stylesheet) {
        var i = -1,
        rules = stylesheet.cssRules,
        text = '';
        while( ++i < rules.length ) {
            text += rules[i].cssText + "\r\n";
        }
        return text;
    },

    redraw, // defined later on, stub to access inside/outside .ready

    /**
       Download some text to the client computer.  Only works in
       browsers that support the 'data:' scheme.

       @param text The text to download.
    **/
    download = function(text) {
        window.location.href =
            'data:application/x-download;charset=utf-8,' +
            encodeURIComponent(text);
    };

    /*******************

    CAUSTIC REQUESTS

    **************/

    $.ajaxSetup({ timeout: 40000 });

    /** Path to hit caustic backend. **/
    var request_path = "/request",

    $mouse, // a div that follows the mouse

    $queue = $({}), // generic queue

    _data = {}, // TODO move this to some kind of page or object data store

    visualsId = "#visuals", // ID for visuals element

    /**
       Store generic data. Uses combiner to modify existing data.

       @param combiner A nondestructive function returning combined
       data.  Will be passed the old value as its first argument, and
       the new value as its second.
       @param key The key of the store to use for persistence.
       @param id The String ID to put tags into.
       @param value The value to put.
    **/
    _put = function(combiner, key, id, value) {
        if(!_data.hasOwnProperty(key)) {
            _data[key] = {};
        }
        _data[key][id] = combiner(_get(key, id), value);
        //redraw();
    },

    /**
       Naively get the value of id in the datastore key.

       @param key the Key of the store used for persistence.
       @param id The id of the persisted data.

       @return The value, or undefined if it is not defined.
    **/
    _get = function(key, id) {
        return _data.hasOwnProperty(key) ? _data[key][id] : undefined;
    },

    /**
       Replace an old value with a new value when used as the combiner in _put().

       @param oldVal the old value.
       @param newVal the new value.
     **/
    _replace = function(oldVal, newVal) {
        return newVal;
    },

    /**
       Extend an old hash (or null/undefined) with a new hash.

       @param oldVal the old value.
       @param newVal the new hash.
    **/
    _extend = function(oldVal, extendWith) {
        return _.extend(
            oldVal === null || typeof oldVal === 'undefined' ?
                {} : oldVal,
            extendWith);
    },

    /**
       Generate a new ID for a response.

       @param parentId The parent ID, can be omitted if this is root.

       @return The new ID.
     **/
    newId = function(parentId) {
        id = _.uniqueId('response');
        _put(_replace, 'parent', id, parentId);
        //if(parentId === null || typeof parentId === 'undefined') {
            //_put('children', _extend_merge, parentId, obj);
        //}

        return id;
    },
    // getIdKeyValue = function(id) {
    //     return _get('id', id);
    // },
    getParent = function(id) {
        return _get('parent', id);
    },

    /**
       Get the root ID of an ID.

       @param id the ID to find the root of.
    **/
    getRoot = function(id) {
        return ascend(function(memo, parent) { return parent; }, null, id);
    },
    // getChildren = function(id) {
    //     return _get('children', id);
    // },

    getResponse = function(id) {
        return _get('response', id);
    },

    /**
       Iterate up the ID tree.

       @param iterator A function that will be passed each value up
       the tree in turn, with the result of the last iteration as the
       first argument, and the parent ID as the second.
       @param memo An initial value for iterator's first argument.
       @param id the String ID to get data for.

       @return The result of iterator's last execution.
    **/
    ascend = function(iterator, memo, id) {
        do {
            memo = iterator(memo, id);
        } while((id = getParent(id)) !== undefined);
        return memo;
    },

    getTags = function(id) {
        return ascend(function(memo, id) {
            var resp = _get('response', id),
            tags = _get('tags', id);
            if(!_.isUndefined(tags)) { // Special tags may not be defined for every ID
                // prefer child values
                memo = _.extend({}, tags, memo);
            }
            // if(!_.isUndefined(resp)) {
            //     if(resp.children.length == 1) {
            //         var name = resp.name,
            //         value = resp.children[0].name;
            //         // don't overwrite properties -- this means we prefer child values
            //         if(!memo.hasOwnProperty(name)) {
            //             memo[name] = value;
            //         }
            //     }
            // }
            return memo;
        }, {}, id);
    },

    getCookies = function(id) {
        return ascend(function(memo, id) {
            var resp = _get('response', id);
            if(!_.isUndefined(resp)) {
                if(resp.hasOwnProperty('cookie')) {
                    _.each(resp.cookies, function(cookiesAry, host) {
                        // merge array for host if it already exists.
                        if(memo.hasOwnProperty(host)) {
                            memo.host = memo.host.concat(cookiesAry);
                        } else {
                            memo.host = cookiesAry;
                        }
                    });
                }
            }
            return memo;
        }, {}, id);
    },

    /**
       Tell the user that something went wrong.

       @param warning The String warning to display.
    **/
    warn = function(warning) {
        console.log(warning); // TODO
    },

    /**
       Make a forced request for <code>instruction</code>.

       @param id The String ID of the request.  Used to get tags.
       @param instruction A String instruction.
       @param force Whether to force a load.
       @param uri URI to resolve instruction references against.  Optional.
       @param input Input String.  Optional.

       @param A Promise that wil be resolved with the response when
       the request is done.
    **/
    request = function(id, instruction, force, uri, input) {
        var dfd = $.Deferred();

        $queue.queue('caustic', function() {
            $.post(request_path,
                   JSON.stringify({
                       "id": id,
                       "uri": uri,
                       "instruction": instruction,
                       "cookies": getCookies(id),
                       "tags" : getTags(id),
                       "input": input, // Stringify drops this key if undefined.
                       "force": String(force)}))
                .done(function(resp, status, doc) {
                    dfd.resolve(JSON.parse(doc.responseText));
                    //saveResponse(id, JSON.parse(resp));
                    //redraw(id);
                })
                .fail(function(resp) {
                    warn("Request for " + instruction + " failed: " + resp.statusText);
                    dfd.reject(resp);
                })
                .always(function() {
                    $queue.dequeue('caustic');
                })
        });

        // Non-fx queues are not auto-run.
        if($queue.queue('caustic').length == 1) {
            $queue.dequeue('caustic');
        }

        return dfd.promise();
    },

    /**
       Force a request from a stored response.

       @param response The stored response.
     **/
    // forceRequest = function(response) {
    //     request(response.id, response.instruction, true, response.uri);
    //     //console.log(response);
    // },

    /**
       Save tags independent of other data.  Extends old values with new values.

       @param id The ID to associate with the tags.
       @param tags A JS hash of tags to save.  Should be String-String.
     **/
    saveTags = function(id, tags) {
        _put(_extend, 'tags', id, tags);
    },

    /**
       Save a single new tag value independent of other data.  Replaces old value.

       @param id The ID to associate with the tag.
       @param name The String name of the tag.
       @param value The String value of the tag.
    **/
    saveTag = function(id, name, value) {
        var obj = {};
        obj[name] = value;
        saveTags(id, obj);
    },

    /**
       Save a response from {@link #request}.

       @param id Internal ID used for tags.  Different from the ID
       returned in the response.
       @param resp The response as a JS object.
    **/
    saveResponse = function(id, resp) {
        resp.id = id; // resp is provided with a less useful id originally
        if(resp.hasOwnProperty('children')) {
            // children are returned in a map between input values and
            // full responses.
            // { 'foo': [ <resp>, <resp>, <resp> ],
            //   'bar': [ <resp>, <resp>, <resp> ], ... }
            //
            // This is converted into an array as follows:
            // [{
            //    name: <foo>,
            //    children: [<id>, <id>, <id>,...]
            // }, ...]
            // where the ID is newly generated, and can be used to obtain
            // the original response.

            // TODO write this as an inject?
            var ary = [],
            isBranch = _.size(resp.children) > 1;

            _.each(resp.children, function(respArray, name) {
                var childIds = [],
                groupId = newId(id);

                // Save tag from Find.
                if(resp.status === 'found') {
                    saveTag(
                        isBranch ? groupId : getParent(id),
                        resp.name, name
                    );
                }

                // Generate references for response nodes.
                _.each(respArray, function(childResp) {
                    var childId = newId(groupId);
                    saveResponse(childId, childResp);
                    childIds.push(childId);

                });
                ary.push({
                    name: name,
                    id: groupId,
                    childIds: childIds
                });
            });
            resp.children = ary;
        } else {
            resp.children = []
        }

        _put(_replace, 'response', id, resp);
    };

    /*****************

    EVENT HANDLERS


    ************/

    $(document).ready(function() {

        $mouse = $('#mouse');

        /**
           Handle form request.
        **/
        $('#request form').submit(function() {
            try {
                var instruction = $(this).find('#instruction').val(),
                id = newId();
                saveTags(id, JSON.parse($(this).find('#tags').val()));

                request(id, instruction, true, document.location.href).done(function(resp) {
                    saveResponse(id, resp);
                    redraw(id);
                });
            } catch(err) {
                if(err instanceof SyntaxError) {
                    warn("Bad JSON for tags: " + err.message);
                } else {
                    warn("Unknown error constructing request: " + err.message);
                    console.log(err.stack);
                }
            }
            return false;
        });

        /**
           Handle download request.

           Compresses all stylesheets into text, adds them to the SVG before hitting download.

           Won't work if browser doesn't support 'data:' scheme.
        **/
        $('#download').click(function() {
            var styleText = _.reduce(document.styleSheets, function(memo, sheet) {
                return sheet.disabled === false ? memo + css2txt(sheet) : memo;
            }, '');
            $visuals = $(visualsId).clone();
            $visuals.find('svg')
                .attr('xmlns', "http://www.w3.org/2000/svg")
                .attr('xmlns:xlink', "http://www.w3.org/1999/xlink")
                .prepend($('<style />')
                         .attr('type', 'text/css')
                         .text('<![CDATA[  ' + styleText + '  ]]>'));
            download($visuals.html());
        });

        /**
           Bind global mouse move to manipulating the $mouse element.
        **/
        $("body").bind('mousemove', function(evt) {
            if($mouse.is(':visible')) {
                $mouse.css({
                    "left": evt.pageX + "px",
                    "top": evt.pageY + "px"
                });
            }
        });
    });

    /**
       Called on a node when its circle is clicked.

       @param d Data associated with node.
       @param i Index of node.
    **/
    var onClick = function(d, i) {
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

            request(d.id, d.instruction, true, d.uri).done(function(resp) {
                grow.attr('values', oldGrowValues); // restore old animation values
                elem.style('fill', oldFill);

                // elem.classed('wait', false);
                // elem.classed('loaded', true);

                glow.remove();
                _.extend(d, resp);
                saveResponse(d.id, resp);
                redraw(d.id);
            });
        } else if(d.status === 'loaded') {
            d.children = [];
            d.status = 'wait';

            // elem.classed('loaded', false);
            // elem.classed('wait', true);

            saveResponse(d.id, d);
            redraw(d.id);
        }
    },

    /**
       Called on a node when its circle is hovered over.

       @param d Data associated with node.
       @param i Index of node.
    **/
    onMouseover = function(d, i) {
        if(d.hasOwnProperty('name')) {
            var $container = $('<div />').html(d.name);
            $container.find('title').remove();
            $mouse.empty().append($container);
        } else if(d.status === 'missing') {
            $mouse.text(JSON.stringify(d.missing));
        } else if(d.status === 'failed') {
            $mouse.text(JSON.stringify(d.failed));
        } else {
            return;  // don't show mouseover
        }
        $mouse.scale(240, 960, false, -1);
        $mouse.show();
    },

    /**
       Called on a node when its circle is no longer hovered over.

       @param d Data associated with node.
       @param i Index of node.
    **/
    onMouseout = function(d, i) {
        $mouse.hide();
        //console.log(d);
    };


    /***************************

    VISUALIZATION

    *********************/

    var r = 800 / 2;

    var tree = d3.layout.tree()
        .size([360, r - 120])
        .separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; })
        .children(function(d) {
            if(d.hasOwnProperty('childIds')) {
                // Otherwise it is a child node, its children need to be
                // expanded from IDs into responses.
                return _.map(d.childIds, function(childId) {
                    return getResponse(childId);
                });
            } else {
                // This is a response. Its children
                // are child nodes that can be returned directly.
                return d.children;
            }
        });

    var diagonal = d3.svg.diagonal.radial()
        .projection(function(d) { return [d.y, d.x / 180 * Math.PI]; });

    var origin = d3.svg.diagonal.radial()
        .projection(function(d) { return [0, 0]; });

    $(document).ready(function() {

        var vis = d3.select(visualsId).append("svg")
            .attr("width", r * 2)
            .attr("height", r * 2)
            .append("g")
            .attr('id', 'viewport') // for SVGPan
            .attr("transform", "translate(" + r + "," + r + ")");

        // allow for panning
        $('svg').svgPan();

        /**
           Redraw the node with id.  Actually redraws its entire tree.

           @param id the ID of the node to redraw.
        **/
        redraw = function(id) {
            var nodes = tree.nodes(getResponse(getRoot(id)));

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

        };
    });
})();
