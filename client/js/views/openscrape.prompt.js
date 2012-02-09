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

/*global define*/

define([
    'require',
    'lib/backbone',
    'lib/requirejs.mustache',
    'text!../../templates/prompt.mustache',
    'lib/jquery'
], function (require, backbone, mustache, template) {
    "use strict";

    return backbone.View.extend({
        tagName: 'div',

        className: 'prompt',

        events: {
            'click .resolve' : 'resolve',
            'click .reject'  : 'reject',
            'keypress body'  : 'resolveOrRejectOnKey'
        },

        initialize: function () {
            this.$el
                .hide()
                .html(mustache.render(template), this.model.toJSON())
                .appendTo('body')
                .slideDown();
            this.model.on('resolved', this.resolve, this);
            this.model.on('rejected', this.reject, this);
        },

        dismiss: function () {
            this.$el.slideUp();
            this.remove();
        },

        resolve: function () {
            this.model.resolve();
            this.dismiss();
        },

        reject: function () {
            this.model.reject();
            this.dismiss();
        },

        resolveOrRejectOnKey: function (evt) {
            switch (evt.keyCode) {
            case 13: // enter
                this.resolve();
                break;
            case 8: // backspace
            case 27: // escape
            case 48: // delete
                this.reject();
                break;
            }
        }
    });
});