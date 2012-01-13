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

/*jslint nomen: true*/
/*globals _*/

var openscrape;

if (!openscrape) {
    openscrape = {}; // Define openscrape if not yet defined
}

(function () {
    "use strict";

    // PRIVATE

    var data = {}, // TODO move this to some kind of page or object data store

        /**
         Naively get the value of id in the datastore key.

         @param key the Key of the store used for persistence.
         @param id The id of the persisted data.

         @return The value, or undefined if it is not defined.
         **/
        get = function (key, id) {
            return data.hasOwnProperty(key) ? data[key][id] : undefined;
        },

        /**
         Store generic data. Uses combiner to modify existing data.

         @param combiner A nondestructive function returning combined
         data.  Will be passed the old value as its first argument, and
         the new value as its second.
         @param key The key of the store to use for persistence.
         @param id The String ID to put tags into.
         @param value The value to put.
         **/
        put = function (combiner, key, id, value) {
            if (!data.hasOwnProperty(key)) {
                data[key] = {};
            }
            data[key][id] = combiner(get(key, id), value);
            //redraw();
        },

        /**
         Replace an old value with a new value when used as the combiner in _put().

         @param oldVal the old value.
         @param newVal the new value.
         **/
        replace = function (oldVal, newVal) {
            return newVal;
        },

        /**
         Extend an old hash (or null/undefined) with a new hash.

         @param oldVal the old value.
         @param newVal the new hash.
         **/
        extend = function (oldVal, extendWith) {
            return _.extend(
                oldVal === null || typeof oldVal === 'undefined' ? {} : oldVal,
                extendWith
            );
        },

        getParent = function (id) {
            return get('parent', id);
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
        ascend = function (iterator, memo, id) {
            do {
                memo = iterator(memo, id);
            } while ((id = getParent(id)) !== undefined);
            return memo;
        };

    // PUBLIC

    openscrape.data = {
        /**
           Generate a new ID for a response.

           @param parentId The parent ID, can be omitted if this is root.

           @return The new ID.
        **/
        newId: function (parentId) {
            var id = _.uniqueId('response');
            put(replace, 'parent', id, parentId);
            //if(parentId === null || typeof parentId === 'undefined') {
            //_put('children', _extend_merge, parentId, obj);
            //}

            return id;
        },

        getParent: getParent,

        /**
           Get the root ID of an ID.

           @param id the ID to find the root of.
        **/
        getRoot: function (id) {
            return ascend(function (memo, parent) { return parent; }, null, id);
        },

        getResponse: function (id) {
            return get('response', id);
        },


        getTags: function (id) {
            return ascend(function (memo, id) {
                var resp = get('response', id),
                    tags = get('tags', id);

                if (!_.isUndefined(tags)) { // Special tags may not be defined for every ID
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

        getCookies: function (id) {
            return ascend(function (memo, id) {
                var resp = get('response', id);
                if (!_.isUndefined(resp)) {
                    if (resp.hasOwnProperty('cookie')) {
                        _.each(resp.cookies, function (cookiesAry, host) {
                            // merge array for host if it already exists.
                            if (memo.hasOwnProperty(host)) {
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
           Save tags independent of other data.  Extends old values with new values.

           @param id The ID to associate with the tags.
           @param tags A JS hash of tags to save.  Should be String-String.
        **/
        saveTags: function (id, tags) {
            put(extend, 'tags', id, tags);
        },

        /**
           Save a single new tag value independent of other data.  Replaces old value.

           @param id The ID to associate with the tag.
           @param name The String name of the tag.
           @param value The String value of the tag.
        **/
        saveTag: function (id, name, value) {
            var obj = {};
            obj[name] = value;
            this.saveTags(id, obj);
        },

        /**
           Save a response.

           @param id Internal ID used for tags.  Different from the ID
           returned in the response.
           @param resp The response as a JS object.
        **/
        saveResponse: function (id, resp) {
            resp.id = id; // resp is provided with a less useful id originally
            if (resp.hasOwnProperty('children')) {
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
                    self = this,
                    isBranch = _.size(resp.children) > 1;

                _.each(resp.children, function (respArray, name) {
                    var childIds = [],
                        groupId = self.newId(id);

                    // Save tag from Find.
                    if (resp.status === 'found') {
                        self.saveTag(
                            isBranch ? groupId : self.getParent(id),
                            resp.name,
                            name
                        );
                    }

                    // Generate references for response nodes.
                    _.each(respArray, function (childResp) {
                        var childId = self.newId(groupId);
                        self.saveResponse(childId, childResp);
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
                resp.children = [];
            }

            put(replace, 'response', id, resp);
        }
    };
}());
