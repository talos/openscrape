$(document).ready(function() {
    /*******************

    CAUSTIC REQUESTS

    **************/

    $.ajaxSetup({ timeout: 40000 });

    /** Path to hit caustic backend. **/
    var request_path = "/request",

    _observe, // TODO better system of controlling observed root ID

    _data = {}, // TODO move this to some kind of page data store

    /**
       Put tags for ID in generic data.  Will overwrite data.

       @param key The key of the store to use for persistence.
       @param combine A two-argument nondestructive function returning combined data.
       @param id The String ID to put tags into.
       @param newData The data to add.
    **/
    _put = function(key, combine, id, newData) {
        if(!_data.hasOwnProperty(key)) {
            _data[key] = {};
        }
        _data[key][id] = combine(_data[key][id], newData);
        //console.log(_data[key]);
        //console.log(_data);
        redraw();
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

    // Curry functions for relationships.
    _replace = function(existing, added) {
        return added;
    },
    _append = function(existing, newElem) {
        var ary = $.makeArray(existing);
        ary.push(newElem);
        return ary;
    },
    /**
       Generate a new ID.

       @param key The String key spawning this new ID.
       @param value The String value spawning this new ID.
       @param parentId The parent ID, can be omitted if this is root.

       @return The new ID.
     **/
    newId = function(key, value, parentId) {
        this.id = this.id === undefined ? 0 : ++this.id; // ftw

        if(parentId === null || typeof parentId === 'undefined') {
            _observe = id; // TODO this is hacky, but must be called before redraw() (which is triggered by _put('id,...)
        }

        var obj = {};
        obj[key] = this.id;
        _put('id', _replace, this.id, [key, value]);
        if(parentId !== null && typeof parentId !== 'undefined') {
            _put('parent', _replace, parentId, this.id);
            _put('children', _extend_merge, parentId, obj);
        }
        return this.id;
    },
    getIdKeyValue = function(id) {
        return _get('id', id);
    },
    getParent = function(id) {
        return _get('parent', id);
    },
    getChildren = function(id) {
        return _get('children', id);
    },

    /**
       Extract data for ID from generic persistence.  Ascends tree.

       @param key The key of the store used for persistence.
       @param combine A two-argument nondestructive function returning combined data.
       @param id the String ID to get data for.
    **/
    _getAll = function(key, combine, id) {
        var result = {};
        do {
            result = combine(_get(key, id), result);
        } while((id = getParent(key, id)) !== undefined);
        return result;
    },

    // Curry functions for tags.
    _extend = function(parent, child) {
        return $.extend({}, parent, child); // We extend this direction to prefer child data.
    },
    putTags = function(id, tags) {
        return _put('tags', _extend, id, tags);
    },
    getTags = function(id) {
        return _getAll('tags', _extend, id);
    },

    // Curry functions for cookies.
    /**
       Return new JS obj hash of arrays containing arrays appended
       from parent and child.

       parent A JS obj hash of arrays.
       child A JS obj hash of arrays.
     **/
    _extend_merge = function(parent, child) {
        var combined = $.extend({}, parent);
        $.each(child, function(k, v) {
            combined[k] = $.merge($.makeArray(combined[k]), $.makeArray(v));
        });
        return combined;
    },
    putCookies = function(id, cookies) {
        return _put('cookies', _extend_merge, id, cookies);
    },
    getCookies = function(id) {
        return _getAll('cookies', _extend_merge, id);
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
    **/
    request = function(id, instruction, force, uri, input) {
        this.queue = this.queue === undefined ? new $.Deferred().resolve() : this.queue;
        this.queue = this.queue.pipe(
            $.post(request_path,
                   JSON.stringify({
                       "id": id,
                       "uri": uri,
                       "instruction": instruction,
                       "cookies": getCookies(id),
                       "tags" : getTags(id),
                       "input": input, // Stringify drops this key if undefined.
                       "force": String(force)}))
                .done(handleResponse)
                .fail(function(resp) {
                    warn("Request for " + instruction + " failed: " + resp.statusText);
                }));
        //console.log(this.queue.state());
    },

    /**
       Handle a response from {@link #request}.

       @param json The raw JSON response.
    **/
    handleResponse = function(json) {
        var resp = JSON.parse(json),
        id = resp['id'],
        childInputs = [],
        childIds = [];

        if(resp.hasOwnProperty('cookies')) {
            putCookies(id, resp['cookies']);
        }

        if(resp.hasOwnProperty('values')) {
            // If there were multiple values passed back, create an ID
            // for each child -- it's a branch.
            if(resp['values'].length > 1) {
                $.each(resp['values'], function(idx, value) {
                    var childId = newId(resp['name'], value, id),
                    tagsObj = {};

                    childIds.push(childId);
                    childInputs.push(value);
                    tagsObj[resp['name']] = value;

                    putTags(childId, tagsObj);
                });
            } else { // Otherwise, stick value in with existing ID.
                var tagsObj = {};
                tagsObj[resp['name']] = resp['values'][0];
                childIds.push(id);
                childInputs.push(resp['values'][0]);
                putTags(id, tagsObj);
            }

            // TODO: retry missing tags if affected
        }

        // If content was passed back, children should be executed in this ID.
        if(resp.hasOwnProperty('content')) {
            childIds.push(id);
            childInputs.push(resp['content']);
        }

        if(resp.hasOwnProperty('children')) {
            $.each(resp['children'], function(idx, childInstruction) {
                $.each(childIds, function(idx, childId) {
                    request(childId,
                            childInstruction,
                            false,
                            resp['uri'],
                            childInputs[idx]); // TODO: this is a
                                               // messy way of
                                               // handling child
                                               // inputs, as the two
                                               // arrays happen to be
                                               // the same size
                });
            });
        }

        if(resp.hasOwnProperty('failed')) {
            // TODO: store failed
            console.log("Request failed: " + resp['failed']);
        }

        if(resp.hasOwnProperty('missing')) {
            // TODO: store missing tags
            console.log("TODO retry missing tags: " + resp['missing']);
        }

        //console.log(resp);
    };

    /**
       Handle form request.
    **/
    $('div#request form').submit(function() {
        try {
            var instruction = $(this).find('#instruction').val(),
            id = newId('Root', instruction);
            putTags(id, JSON.parse($(this).find('#tags').val()));
            request(id, instruction, true);
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


    /**
       Construct a hierarchical JS object suitable for visualization.

       @param id The root ID of the visualized object.

       @return A JS object.
     **/
    var constructData = function(id) {
        var name = getIdKeyValue(id)[1],
        obj = {
            name : name,  // TODO not ideal
            children : []
        },
        tags = _get('tags', id), // pull out immediate tags.
        children = getChildren(id);
        if(tags !== null && typeof tags !== 'undefined') {
            $.each(tags, function(name, value) {
                obj.children.push({
                    name:  name,
                    value: value
                });
            });
        }

        // recursively add 'real' children
        if(children !== null && typeof children !== 'undefined') {
            $.each(children, function(key, childrenByKey) {
                var childrenByKeyObj = {
                    name : key,
                    children : []
                };
                $.each(childrenByKey, function(idx, childId) {
                    childrenByKeyObj.children.push(constructData(childId));
                });
                obj.children.push(childrenByKeyObj);
            });
        }

        return obj;
    };

    var w = 800,
    h = 600;

    var cluster = d3.layout.cluster()
        .size([h, w - 160]);

    var diagonal = d3.svg.diagonal()
        .projection(function(d) { return [d.y, d.x]; });

    var vis = d3.select("#visuals").append("svg")
        .attr("width", w)
        .attr("height", h)
        .append("g")
        .attr("transform", "translate(40, 0)");


    var redraw = function() {

        // TODO for now, all redraws are done from _observe as root.
        var nodes = cluster.nodes(constructData(_observe));

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
