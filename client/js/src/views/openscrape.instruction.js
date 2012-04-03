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
    'lib/requirejs.mustache',
    'text!templates/instruction.mustache',
    'models/openscrape.oauth',
    'lib/jquery',
    'lib/chosen.jquery'
], function (require, _, backbone, json_parse, mustache, template, OAuthModel) {
    "use strict";

    var $ = require('jquery');

    return backbone.View.extend({

        tagName: 'div',

        className: 'instruction',

        events: {
            'keypress #value textarea': _.debounce(function (evt) {
                $(evt.target).trigger('change');
            }, 500),
            'change #value textarea': 'editValue'
        },

        initialize: function () {
            this.oauth = new OAuthModel();
        },

        render: function (defaults) {
            this.oauth.fetch();
            var context = _.extend(defaults || {}, this.model.toJSON());
            context.oauth = this.oauth.toJSON();
            context.editable = context.oauth.user === this.model.user().name;
            this.$el.html(mustache.render(template, context))
                .find('.chzn-select').chosen();
            return this;
        },

        valueInput: function () {
            return this.$el.find('#value textarea');
        },

        showErrors: function (errors) {
            this.valueInput().addClass('invalid');
            this.render({errors: errors});
        },

        editValue: function () {
            var input = this.valueInput();
            try {
                this.model.set('value', json_parse(input.val()), {
                    error: _.bind(this.showErrors, this)
                });
            } catch (e) {
                if (e.name === 'SyntaxError') {
                    this.showErrors(["Bad JSON @ character " + e.at + ": " + e.message]);
                } else {
                    console.log('uncaught');
                    throw e;
                }
            }
        }

    });
});
