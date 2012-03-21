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

/*jslint browser: true, nomen: true*/
/*global define*/

define([
    'require',
    'lib/underscore',
    'lib/backbone',
    'lib/requirejs.mustache',
    'text!templates/signup.mustache'
], function (require, _, backbone, mustache, template) {
    "use strict";

    var $ = require('jquery');

    return backbone.View.extend({
        tagName: 'div',
        id: 'signup',

        events: {
            'submit form': 'preventDefault',
            'click input[type=button]': 'submit'
        },

        initialize: function () {
        },

        render: function (context) {
            this.$el.html(mustache.render(template, context || {}));
            this.$form = this.$el.find('form');
            return this;
        },

        preventDefault: function (evt) {
            evt.preventDefault();
        },

        submit: function (evt) {
            var data = this.$form.serialize(),
                $button = $(evt.currentTarget);
            data = data + '&' + encodeURIComponent($button.attr('name')) + '='
                + encodeURIComponent($button.val());

            $.ajax({
                url: this.$form.attr('action'),
                type: this.$form.attr('method'),
                dataType: 'json',
                data: data
            }).done(_.bind(function (context) {
                console.log(context);
                this.render(context);
            }, this)).fail(_.bind(function (jqXHR) {
                this.render({'error': 'There was an unknown failure'});
            }, this));
        }
    });
});
