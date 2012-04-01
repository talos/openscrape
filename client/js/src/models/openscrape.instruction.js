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
    'require',
    'lib/underscore',
    'lib/backbone',
    'json!schema/instruction.json',
    //'lib/jsv/jsv',
    'lib/jsv/json-schema-draft-03'
], function (require, _, backbone, schemaObject) {
    "use strict";

    var JSV = require('lib/jsv/jsv').JSV,
        env = JSV.createEnvironment(),
//         schema = env.createSchema(schemaObject);
//         testSchema = env.createSchema({'type': 'string'});
//         test = testSchema.validate({'foo': 'bar'});
// 
//     console.log(test);
//     console.log(schema.getSchema());
//     console.log(env.getDefaultSchema());
// 
    return backbone.Model.extend({

        initialize: function () {
            //this.sync = this.collection.sync;
        },

        /**
         * Validate the instruction model's value against the instruction
         * schema.
         */
        validate: function () {
            if (!this.has('value')) {
                return ['No value has been defined'];
            }
            var errors = schema.validate(this.value()).errors;
            if (errors.length > 0) {
                return errors;
            }
        },

        value: function () {
            return this.get('value');
        }
    });
});

