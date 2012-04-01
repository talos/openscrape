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
    '../openscrape.localsync',
    'models/openscrape.response',
    'lib/jquery'
], function (_, backbone, LocalSync, ResponseModel) {
    "use strict";

    var $ = require('jquery');

    return backbone.Collection.extend({
        model: ResponseModel,

        localStorage: new LocalSync('responses'),

        initialize: function (options) {
            if (options.caustic) {
                this.caustic = options.caustic;
            } else {
                throw new Error('Must include Caustic instance.');
            }
        },

        sync: function (method, model, options) {
            switch (method) {
            case 'create':
                this.caustic.request(json.stringify(model.toJSON()));
            case 'read':
                break;
            case 'update':
                break;
            case 'delete':
                break;
            }
            return this.localStorage.sync(method, model, options);
        }
    });
});
