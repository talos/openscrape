$(document).ready(function() {
    /*******************

    CAUSTIC REQUESTS

    **************/

    $.ajaxSetup({ timeout: 5000 });

    /** Path to hit caustic backend. **/
    var request_path = "/request",

    _data = {}, // TODO move this to some kind of page data store

    /**
       Put tags for ID in generic data.  Will overwrite data.

       @param key The key of the store to use for persistence.
       @param combine A two-argument nondestructive function returning combined data.
       @param id The String ID to put tags into.
       @param src A JS Object hash maping key/value tags.
    **/
    _put = function(key, combine, id, src) {
        if(!_data.hasOwnProperty(key)) {
            _data[key] = {};
        }
        _data[key][id] = combine(_data[key][id], src);
        console.log(_data[key]);
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
    _replace = function(parent, child) {
        return child;
    },

    /**
       Generate a new ID.

       @param parentId The parent ID, can be omitted if this is root.

       @return The new ID.
     **/
    newId = function(parentId) {
        this.id = this.id === undefined ? 0 : ++this.id; // ftw
        if(parentId !== null && typeof parentId !== 'undefined') {
            _put('parent', _replace, parentId, this.id);
        }
        return this.id;
    },
    getParent = function(id) {
        return _get('parent', id);
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
       parent A JS obj hash of arrays.
     **/
    _extend_merge = function(parent, child) {
        var combined = $.extend({}, parent);
        $.each(child, function(k, v) {
            combined[k] = $.merge($.makeArray(combined[k]), v);
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
        alert(warning); // TODO
    },

    /**
       Make a forced request for <code>instruction</code>.

       @param id The String ID of the request.  Used to get tags.
       @param instruction A String instruction.
       @param uri URI to resolve instruction references against.  Optional.
       @param input Input String.  Optional.
    **/
    request = function(id, instruction, uri, input) {
        $.post(request_path,
               JSON.stringify({
                   "id": id,
                   "uri": uri,
                   "instruction": instruction,
                   "cookies": getCookies(id),
                   "tags" : getTags(id),
                   "input": input, // Stringify drops this key if undefined.
                   "force": "true"}))
            .done(handleResponse)
            .fail(function(resp) {
                warn("Request for " + instruction + " failed: " + resp.statusText);
            });
    },

    /**
       Handle a response from {@link #request}.

       @param json The raw JSON response.
    **/
    handleResponse = function(json) {
        var resp = JSON.parse(json),
        id = resp['id'],
        childIds = [];

        if(resp.hasOwnProperty('cookies')) {
            putCookies(id, resp['cookies']);
        }

        if(resp.hasOwnProperty('values')) {
            // If there were multiple values passed back, create an ID
            // for each child -- it's a branch.
            if(resp['values'].length > 1) {
                $.each(resp['values'], function(idx, value) {
                    var childId = newId(id),
                    tagsObj = {};

                    childIds.push(childId);
                    tagsObj[resp['name']] = value;

                    putTags(childId, tagsObj);
                });
            } else { // Otherwise, stick value in with existing ID.
                var tagsObj = {};
                tagsObj[resp['name']] = resp['values'][0];
                childIds.push(id);
                putTags(id, tagsObj);
            }

            // TODO: retry missing tags if affected
        }

        // If content was passed back, children should be executed in this ID.
        if(resp.hasOwnProperty('content')) {
            childIds.push(id);
        }

        if(resp.hasOwnProperty('children')) {
            $.each(resp['children'], function(idx, childInstruction) {
                $.each(childIds, function(idx, childId) {
                    request(childId,
                            childInstruction,
                            resp['uri'],
                            resp['content']);
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
            var id = newId();
            putTags(id, JSON.parse($(this).find('#tags').val()));
            request(id, $(this).find('#instruction').val());
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

    
});
