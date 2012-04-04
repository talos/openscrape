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
    'lib/json_parse',
    'lib/json2',
    'lib/requirejs.mustache',
    'text!templates/instruction.mustache',
    'text!templates/errors.mustache',
    'models/openscrape.oauth',
    'lib/jquery',
    'lib/chosen.jquery'
], function (require, _, backbone, json_parse, json, mustache,
             instructionTemplate, errorsTemplate, OAuthModel) {
    "use strict";

    var $ = require('jquery');

    return backbone.View.extend({

        tagName: 'div',

        className: 'instruction',

        events: {
            'keydown #value textarea': _.debounce(function (evt) {
                $(evt.target).trigger('change');
            }, 500),
            'change #value textarea': 'editValue'
        },

        initialize: function () {
            this.oauth = new OAuthModel();
        },

        render: function () {
            this.oauth.fetch();
            var context = this.model.toJSON();
            context.oauth = this.oauth.toJSON();
            context.editable = context.oauth.user === this.model.user().name;

            // Recursively transform the associative array of the
            // instruction into component objects
            // context.value = _.map(context.value, function (value, key) {
            //     return {
            //         key: key,
            //         value: value
            //     };
            // });

            // for now, just dump json as stringify
            context.value = json.stringify(context.value, undefined, 2);
            this.$el.html(mustache.render(instructionTemplate, context))
                .find('.chzn-select').chosen();
            this.$errors = this.$el.find('#errors');
            return this;
        },

        valueInput: function () {
            return this.$el.find('#value textarea');
        },

        showErrors: function (errors) {
            console.log(errors);
            this.valueInput().addClass('invalid');
            this.$errors.html(mustache.render(errorsTemplate, {errors: errors}));
        },

        clearErrors: function () {
            this.$errors.empty();
        },

        editValue: function () {
            var input = this.valueInput(),
                parsed,
                modified;
            try {
                parsed = json_parse(input.val());
                modified = this.model.set('value', parsed, {
                    error: _.bind(function (model, errors) {
                        this.showErrors(_.map(errors, function (error) {
                            return {
                                name: 'Invalid Instruction',
                                desscription: error.message
                            };
                        }));
                    }, this)
                });
                if (modified) {
                    this.clearErrors();
                }
            } catch (e) {
                if (e.name === 'SyntaxError') {
                    this.showErrors([{
                        name: "Bad JSON",
                        description: "Bad JSON @ character " + e.at + ": " + e.message
                    }]);
                } else {
                    throw e;
                }
            }
        }

    });
});
