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
        store: new Store('nodes'),

        /**
         * Get an array of nodes from an array of IDs.
         *
         * @param {Array} ids array of IDs.
         *
         * @return {Array} of nodes in the same order as the original ids.
         * If an ID was not found, it will have a null entry.
         */
        getAll: function (ids) {
            return _.map(ids, function (id) { return this.get(id); }, this);
        }
    });
});