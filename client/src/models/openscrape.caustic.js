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
    'require',
    'lib/underscore',
    'lib/backbone',
    'lib/jquery'
], function (require, _, backbone) {
    "use strict";

    var $ = require('jquery'),

    // function Result(collection, value, children) {
    //     this._collection = collection;
    //     this._value = value;
    //     this._children = children;
    // }

    // Result.prototype.value = function () {
    //     return this._value;
    // };

    // Result.prototype._children = function () {
    //     return _.map(this._childIds, _.bind(function (childId) {
    //         return this._collection.get(childId);
    //     }, this));
    // };

        CausticModel = backbone.Model.extend({
            /**
             * Inherit sync function from collection.
             */
            sync: function () {
                return this.collection.sync.apply(this.collection, arguments);
            },

            initialize: function (attributes) {
                this.parse(attributes);
            },

            /**
             * Generate nested models inside results.
             */
            parse: function (response) {
                var collection = this.collection;
                _.each(response.results, function (result) {
                    if (result.children) {
                        result.children = _.map(result.children, function (child) {
                            return new CausticModel(child, {collection: collection});
                        });
                    }
                });
                return response;
            }

    //         /**
    //          * Obtain the parent model.
    //          *
    //          * @return {CausticModel} the parent, or undefined if there is none.
    //          */
    //         parent: function () {
    //             return this.collection.get(this.get('parentId'));
    //         },
    // 
    //         /**
    //          * @return {String} the name resulting from the execution of the
    //          * instruction, undefined if the instruction was not executed.
    //          */
    //         name: function () {
    //             return this.get('name');
    //         },
    // 
    //         /**
    //          * @return {String} the URI relative to which links were resolved when
    //          * following the instruction.
    //          */
    //         uri: function () {
    //             return this.get('uri');
    //         },
    // 
    //         /**
    //          * @return {String} the status of the instruction.
    //          */
    //         status: function () {
    //             return this.get('status');
    //         },
    // 
    //         /**
    //          * @return {String|Object|Array} the instruction in the request.
    //          */
    //         instruction: function () {
    //             return this.get('instruction');
    //         },
    // 
    //         /**
    //          * @return {Array<Result>} An array of Result objects.
    //          */
    //         results: function () {
    //             return _.map(this.get('results'), function (result) {
    //                 return new Result(this.collection, result.value, result.childIds);
    //             });
    //         }

        });
    return CausticModel;
});
