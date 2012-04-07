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
    'lib/json2',
    'openscrape.localsync',
    'openscrape.queue',
    'models/openscrape.caustic',
    'lib/jquery'
], function (require, _, backbone, json, LocalSync, Queue, CausticModel) {
    "use strict";

    var $ = require('jquery');

    return backbone.Collection.extend({
        model: CausticModel,

        initialize: function () {
            this.queue = new Queue('caustic');
            this.localSync = new LocalSync('caustic');
        },

        /**
         * Enable this collection's syncing abilities with the provided
         * requestFunc.
         *
         * @param {Function} requestFunc the function to use when requesting
         * a model.
         */
        enable: function (requestFunc) {
            this._requestFunc = requestFunc;
            this.queue.start();
        },

        sync: function (method, model, options) {
            if (!this._requestFunc) {
                this.trigger('request');
            }

            var dfd = new $.Deferred();

            if (method === 'create' || method === 'update') {
                this.queue.queue(_.bind(function (next) {
                    this._requestFunc(json.stringify(model))
                        .done(function (jsonResp) {
                            dfd.resolve(json.parse(jsonResp));
                        })
                        .fail(function (msg) {
                            dfd.reject(msg);
                        })
                        .always(function () {
                            next(); // next on the line
                        });
                }, this));
            } else {
                dfd.resolve(model);
            }

            // pipe successful persistence to localsync
            // this takes care of callbacks, too
            return dfd.pipe(_.bind(function (model) {
                return this.localSync(method, model, options);
            }, this), function (errorMsg) {
                // unsuccessful persistence needs to hit callback manually
                options.error(errorMsg);
            }).promise();
        }
    });
});
