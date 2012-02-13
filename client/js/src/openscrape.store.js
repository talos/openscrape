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
    'require',
    'lib/json2',
    'lib/underscore',
    'lib/jquery'
], function (require, json, _) {
    "use strict";

    // A simple module to persist to localstorage.
    // Models are given GUIDS, and saved into a JSON object. Simple
    // as that.

    // Generate four random hex digits.
    function S4() {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    }

    // Generate a pseudo-GUID by concatenating random hexadecimal.
    function guid() {
        return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
    }

    // Our Store is represented by a single JS object in *localStorage*. Create it
    // with a meaningful name, like the name you'd give a table.
    var $ = require('jquery'),
        Store = function (name) {
            this.name = name;
            var store = localStorage.getItem(this.name);
            this.records = (store && store.split(",")) || [];
        };

    _.extend(Store.prototype, {

        // Save the current state of the **Store** to *localStorage*.
        save: function () {
            localStorage.setItem(this.name, this.records.join(","));
        },

        // Add a model, giving it a (hopefully)-unique GUID, if it doesn't already
        // have an id of it's own.
        create: function (model) {
            if (!model.id) {
                model.id = model.attributes.id = guid();
            }
            localStorage.setItem(this.name + "-" + model.id, json.stringify(model));
            this.records.push(model.id.toString());
            this.save();
            return $.Deferred().resolve(model).promise();
        },

        // Update a model by replacing its copy in `this.data`.
        update: function (model) {
            localStorage.setItem(this.name + "-" + model.id, json.stringify(model));
            if (!_.include(this.records, model.id.toString())) {
                this.records.push(model.id.toString()); this.save();
            }
            return $.Deferred().resolve(model).promise();
        },

        // Retrieve a model from `this.data` by id.
        find: function (model) {
            return $.Deferred().resolve(
                json.parse(localStorage.getItem(this.name + "-" + model.id))
            ).promise();
        },

        // Return the array of all models currently in storage.
        findAll: function () {
            return $.Deferred().resolve(_.map(this.records, function (id) {
                return json.parse(localStorage.getItem(this.name + "-" + id));
            }, this)).promise();
        },

        // Delete a model from `this.data`, returning it.
        destroy: function (model) {
            localStorage.removeItem(this.name + "-" + model.id);
            this.records = _.reject(this.records, function (record_id) {
                return record_id === model.id.toString();
            });
            this.save();
            return $.Deferred().resolve(model).promise();
        }
    });
    return Store;
});
