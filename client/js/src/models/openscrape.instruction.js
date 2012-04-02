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
    'lib/jsv/json-schema-draft-03'
], function (require, _, backbone, schemaObject) {
    "use strict";

    var JSV = require('lib/jsv/jsv').JSV, // required by json-schema-draft-03
        env = JSV.createEnvironment(),
        tagSchema = env.createSchema({
            "type": "array",
            "items": {"type": "string"}
        }),
        valueSchema = env.createSchema(schemaObject);

    return backbone.Model.extend({

        defaults: function () {
            return {
                'tags': []
            };
        },

        urlRoot: function () {
            return '/instructions/' + this.user().name();
            //return this.user().url();
        },

        idAttribute: 'name',

        /**
         * Validate the instruction model's value against the instruction
         * schema.
         */
        validate: function () {
            var errors = [];
            if (!this.has('user')) {
                errors.push('No user for this instruction');
            }
            if (!this.has('name')) {
                errors.push('No name for this instruction');
            }
            if (!this.has('value')) {
                errors.push('No value has been defined');
            }
            if (this.has('tags')) {
                errors = errors.concat(tagSchema.validate(this.tags()).errors);
            }
            errors = errors.concat(valueSchema.validate(this.value()).errors);
            if (errors.length > 0) {
                return errors;
            }
        },

        user: function () {
            return this.get('user');
        },

        name: function () {
            return this.get('name');
        },

        value: function () {
            return this.get('value');
        },

        tags: function () {
            return this.get('tags');
        }
    });
});

