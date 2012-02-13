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

/**
 * Adapted from:
 *
 *  * Backbone localStorage Adapter v1.0
 *  * https://github.com/jeromegn/Backbone.localStorage
 *  */

/*jslint nomen: true*/
/*global define, localStorage*/

define([
    'lib/backbone'
], function (backbone) {
    "use strict";

    // TEMPORARY
    localStorage.clear();

    // Maps CRUD to the 'store' property of models or collections.
    // Store should return a promise that will be resolved with the
    // response, or rejected.
    backbone.sync = function (method, model, options) {

        var promise,
            store = model.store || model.collection.store;

        switch (method) {
        case "read":    promise = model.id ? store.find(model) : store.findAll(); break;
        case "create":  promise = store.create(model);                            break;
        case "update":  promise = store.update(model);                            break;
        case "delete":  promise = store.destroy(model);                           break;
        }

        return promise
            .done(function (resp) {
                options.success(resp.toJSON());
            })
            .fail(function (msg) {
                options.error(msg);
            });
    };
});