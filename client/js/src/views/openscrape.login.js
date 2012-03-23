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
    'text!templates/login.mustache',
    'lib/jquery'
], function (require, _, backbone, mustache, template) {
    "use strict";

    var $ = require('jquery');

    return backbone.View.extend({
        tagName: 'div',
        id: 'login',

        events: {
            'submit form': 'submit'
        },

        initialize: function () {
            window.addEventListener("message", _.bind(this.receiveMessage, this), false);
        },

        render: function (context) {
            this.$el.html(mustache.render(template, context || {}));
            return this;
        },

        receiveMessage: function (evt) {
            if (evt.origin === window.location.origin) {
                this.render(evt.data);
            }
        },

        submit: function (evt) {
            evt.preventDefault();
            var $form = $(evt.currentTarget);
            $.ajax({
                url: $form.attr('action'),
                type: $form.attr('method'),
                dataType: 'json',
                data: $form.serialize()
            }).done(_.bind(function (context) {
                this.render(context);
            }, this)).fail(_.bind(function (jqXHR) {
                this.render({'error': 'There was an unknown failure'});
            }, this));
        }
    });
});
