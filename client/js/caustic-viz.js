/**
   Depends upon jQuery (1.7.1), Underscore (1.2.4), d3 core, d3
   layout, and json2.

   Licensed under the GNU GPL v3.
**/

$(document).ready(function() {
    /*******************

    CAUSTIC REQUESTS

    **************/

    $.ajaxSetup({ timeout: 40000 });

    /** Path to hit caustic backend. **/
    var request_path = "/request",

    _data = {}, // TODO move this to some kind of page or object data store

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
       Generate a new ID.

       @param parentId The parent ID, can be omitted if this is root.

       @return The new ID.
     **/
    newId = function(parentId) {
        id = _.uniqueId();
        if(parentId === null || typeof parentId === 'undefined') {
            _put(_replace, 'parent', id, parentId);
            //_put('children', _extend_merge, parentId, obj);
        }

        return id;
    },
    // getIdKeyValue = function(id) {
    //     return _get('id', id);
    // },
    getParent = function(id) {
        return _get('parent', id);
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
            if(!_.isUndefined(resp)) {
                if(resp.children.length == 1) {
                    var name = resp.name,
                    value = resp.children[0].name;
                    // don't overwrite properties -- this means we prefer child values
                    if(!memo.hasOwnProperty(name)) {
                        memo[name] = value;
                    }
                }
            }
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

       @param $queue A jQuery DOM object to queue under.
       @param id The String ID of the request.  Used to get tags.
       @param instruction A String instruction.
       @param force Whether to force a load.
       @param uri URI to resolve instruction references against.  Optional.
       @param input Input String.  Optional.
    **/
    request = function($queue, id, instruction, force, uri, input) {
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
                .done(function(resp) {
                    saveResponse(id, JSON.parse(resp));
                    //console.log(JSON.stringify(getResponse(id), null, 2));
                    //console.log(_data);
                    redraw(id);
                })
                .fail(function(resp) {
                    warn("Request for " + instruction + " failed: " + resp.statusText);
                })
                .always(function() {
                    $queue.dequeue('caustic');
                })
        });

        // Non-fx queues are not auto-run.
        if($queue.queue('caustic').length == 1) {
            $queue.dequeue('caustic');
        }
    },

    /**
       Save tags independent of other data.

       @param id The ID to associate with the tags.
       @param tags A JS hash of tags to save.  Should be String-String.
     **/
    saveTags = function(id, tags) {
        _put(_replace, 'tags', id, tags); // TODO: should not replace existing tags
    },

    /**
       Save a response from {@link #request}.

       @param id Internal ID used for tags.  Different from the ID
       returned in the response.
       @param resp The response as a JS object.
    **/
    saveResponse = function(id, resp) {
        //console.log("before: " + JSON.stringify(resp, null, 2));
        if(resp.hasOwnProperty('children')) {
            // children are returned in a map between input values and
            // full responses.  This is converted into an array with
            // objects in the format of:
            // {
            //    name: <key of map>,
            //    children: [<id>, <id>, <id>,...]
            // }
            // where the ID is newly generated, and can be used to get
            // the response that was there.
            var ary = [];
            _.each(resp.children, function(respArray, name) {
                var childIds = []
                _.each(respArray, function(childResp) {
                    var childId = newId(id);
                    saveResponse(childId, childResp);
                    childIds.push(childId);
                });
                ary.push({
                    name: name,
                    childIds: childIds
                });
            });
            resp.children = ary;
        } else {
            resp.children = []
        }

        _put(_replace, 'response', id, resp);
    };

    /**
       Handle form request.
    **/
    $('div#request form').submit(function() {
        try {
            var instruction = $(this).find('#instruction').val(),
            id = newId();
            saveTags(id, JSON.parse($(this).find('#tags').val()));

            // TODO should select the lock object dynamically
            request($('#visuals'), id, instruction, true);
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

    /***************************

    VISUALIZATION

    *********************/

    var w = 800,
    h = 600;

    // var inflate = function(id) {
    //     var obj = _.clone(getResponse(id)),
    //     inflatedChildren = [];
    //     console.log('before: ' + JSON.stringify(obj));
    //     _.each(obj.children, function(child) {
    //         var inflatedChild = {
    //             name: child.name,
    //             children: []
    //         };
    //         _.each(child.childIds, function(childId) {
    //             console.log(childId);
    //             inflatedChild.children.push(inflate(childId));
    //         });
    //     });
    //     obj.children = inflatedChildren;
    //     console.log('after: ' + JSON.stringify(obj));
    //     return obj;
    // };

    var cluster = d3.layout.cluster()
        .size([h, w - 160])
        .children(function(d) {
            // try {
            //     console.log('calling children with: ' + JSON.stringify(d, null, 2));
            // } catch(err) {
            //     console.log(err);
            //     console.log(d);
            //     console.log(d.hasOwnProperty('id'));
            //     console.log(d.children);
            // }
            if(d.hasOwnProperty('id')) {
                // If data has an id, it is a response. Its children
                // are child nodes that can be returned directly.
                return d.children;
            } else {
                // Otherwise it is a child node, its children need to be
                // expanded from IDs into responses.
                var children = [];
                //console.log(JSON.stringify(d.children));
                //console.log('working with: ' + JSON.stringify(d, null, 2));
                _.each(d.childIds, function(childId) {
                    //console.log('adding: ' + JSON.stringify(getResponse(childId), null, 2));
                    children.push(getResponse(childId));
                });
                return children;
            }
        });

    var diagonal = d3.svg.diagonal()
        .projection(function(d) { return [d.y, d.x]; });

    var vis = d3.select("#visuals").append("svg")
        .attr("width", w)
        .attr("height", h)
        .append("g")
        .attr("transform", "translate(40, 0)");

    /**
       Redraw the node with id.

       @param id the ID of the node to redraw.
     **/
    var redraw = function(id) {
        //var nodes = cluster.nodes(inflate(id));
        var nodes = cluster.nodes(getResponse(id));

        console.log("response: ");
        console.log(getResponse(id));
        console.log("nodes:");
        console.log(nodes);

        var link = vis.selectAll("path.link")
            .data(cluster.links(nodes));

        link.enter().append("path")
            .attr("class", "link")
            .attr("d", diagonal);

        link.transition()
            .duration(1000)
            .attr("d", diagonal);

        var node = vis.selectAll("g.node")
            .data(nodes);

        var nodeG = node.enter().append("g")
            .attr("class", "node")
            .attr("transform", function(d) {
                return "translate(" + d.y  + "," + d.x + ")"; })

        nodeG.append("circle")
            .attr("r", 4.5);

        nodeG.append("text")
            .attr("dx", function(d) { return d.children ? -8 : 8; })
            .attr("dy", 3)
            .attr("text-anchor", function(d) { return d.children ? "end" : "start"; })
            .text(function(d) {
                var text = d.name;
                if(d.value !== null && typeof d.value !== 'undefined') {
                    text += ': ' + d.value;
                }
                return text;
            });

        node.transition()
            .duration(1000)
            .attr("transform", function(d) {
                return "translate(" + d.y  + "," + d.x + ")"; })

        node.exit().remove();
        link.exit().remove();
    };
});
