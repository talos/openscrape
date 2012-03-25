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

/*jslint nomen: true, browser: true*/
/*global define*/

define([
    'lib/underscore',
    'lib/backbone',
    '../openscrape.localsync',
    '../openscrape.zip2borough',
    'models/openscrape.node'
], function (_, backbone, LocalSync, zip2borough, NodeModel) {
    "use strict";

    return backbone.Collection.extend({
        model: NodeModel,

        sync: new LocalSync('nodes'),

        /**
         * Get an array of nodes from an array of IDs.
         *
         * @param {Array[String]} ids array of IDs.
         *
         * @return {Array[openscrape.NodeModel]} The models whose IDs were in the list.
         */
        filterIds: function (ids) {
            //return _.map(ids, function (id) { return this.get(id); }, this);
            return this.filter(function (model) {
                return _.include(ids, model.id);
            });
        },

        /**
         * Find all root nodes -- those with no ancestors.
         *
         * @return {Array[openscrape.NodeModel]} All root models.
         */
        roots: function () {
            return this.filter(function (model) {
                return !_.has(model, 'parent');
            });
        },

        /**
         * Find the root node corresponding to this address.  Creates
         * a new one if there is none.
         *
         * @param {openscrape.Address} address the address.
         *
         * @return {openscrape.NodeModel} the model for this address, or
         * undefined if it was not possible to create a node for the address.
         * In that case, an error will be triggered on the collection.
         */
        forAddress: function (address) {
            var addressTags = address.toJSON(),
                borough = zip2borough(address.zip);

            if (borough) {
                addressTags.apt = '';
                addressTags.Borough = addressTags.borough = borough;
                return _.find(this.roots(), function (node) {
                    var tags = node.tags();
                    return _.all(addressTags, function (value, key) {
                        return tags[key] === value;
                    });
                }) || this.create({
                    instruction: '/instructions/openscrape/' + address.zip + '/',
                    uri: window.location.href.split('/').slice(0, 3).join('/') + '/instructions/',
                    name: 'Property Info',
                    type: 'wait',
                    tags: addressTags
                });
            } else {
                this.trigger('error', null, address.toString() +
                             ' is not in the five boroughs.');
                return undefined;
            }
        }
    });
});
