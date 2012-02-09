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

define([
    'lib/underscore',
    'lib/backbone',
    '../openscrape.store',
    'models/openscrape.node'
], function (_, backbone, Store, NodeModel) {
    "use strict";

    return backbone.Collection.extend({
        model: NodeModel,

        /**
         * Initialize a new collection of nodes.  Must have an ID.
         */
        initialize: function (models, options) {
            if (_.has(options, 'id')) {
                this.store = new Store('nodes' + options.id);
            } else {
                throw "Must initialize nodes collection with an id.";
            }
        },

        /**
         * Get an array of nodes by ID.
         */
        getAll: function (ids) {
            return this.filter(function (node) {
                return _.include(ids, node.id);
            });
        },

        /**
         * Parse and add in raw caustic response input.
         *
         * @param {Object} resp
         *
         * @return {openscrape.NodeModel}
         */
        addRaw: function (resp) {

            var children = resp.children,
                node,
                childIds = [],
                childAncestors = resp.ancestors || [];

            resp.type = resp.type || resp.status;

            delete resp.children;

            node = this.create(resp);

            // Do we have an id set?
            console.log(node);

            childAncestors.push(node.id);

            if (_.has(resp, 'status')) {
                // is a proper response
                node.set('type', resp.status);
                _.each(children, function (respAry, valueName) {
                    var value = {
                            name: valueName,
                            ancestors: childAncestors,
                            type: resp.status === 'loaded' ? 'page' : 'match',
                            children: respAry,
                            tags: {}
                        };
                    if (resp.status === 'found') {
                        if (children.length === 1) {
                            // one-to-one relations keep the tag in the parent
                            resp.tags[resp.name] = valueName;
                            node.set('tags', resp.tags);
                        } else {
                            // otherwise, the tag is in the child.
                            value.tags[resp.name] = valueName;
                        }
                    }

                    childIds.push(this.addRaw(value).id);
                }, this);
            } else {
                // is a value
                _.each(resp.children, function (child) {
                    child.ancestors = childAncestors;
                    childIds.push(this.addRaw(child).id);
                }, this);
            }
            node.save();

            return node;
        }
    });
});