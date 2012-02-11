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
    'text!../../templates/warning.mustache',
    'lib/jquery'
], function (require, _,  backbone, mustache, template) {
    "use strict";

    var $ = require('jquery');

    return backbone.View.extend({
        tagName: 'div',

        className: 'warning',

        events: {
            'click .ok': 'dismiss'
        },

        initialize: function () {
            this.$el
                .hide()
                .html(mustache.render(template, this.model.toJSON()))
                .prependTo('body')
                .slideDown();
            this.model.on('dismiss', this.dismiss, this);
            this.keyEvt = 'keydown.warning' + this.model.cid;
            $(document).bind(this.keyEvt, _.bind(this.dismissOnKey, this));
        },

        remove: function () {
            $(document).unbind(this.keyEvt);
            backbone.View.prototype.remove.call(this);
        },

        dismiss: function () {
            this.model.dismiss();
            this.$el.slideUp('fast', _.bind(this.remove, this));
        },

        dismissOnKey: function (evt) {
            switch (evt.keyCode) {
            case 8: // backspace
            case 13: // enter
            case 27: // escape
            case 48: // delete
                this.dismiss();
                break;
            }
        }
    });
});