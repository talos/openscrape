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
    'text!templates/controls.mustache'
], function (require, _, backbone, mustache, template) {
    "use strict";

    //var $ = require('jquery');

    return backbone.View.extend({

        tagName: 'div',
        id: 'controls',

        events: {
            'click #zoomIn' : 'zoomIn',
            'click #zoomOut' : 'zoomOut',
            'click #panUp': 'panUp',
            'click #panDown': 'panDown',
            'click #panLeft': 'panLeft',
            'click #panRight': 'panRight'
        },

        render: function () {
            this.$el.html(mustache.render(template));
            return this;
        },

        zoomIn: function () {
            this.trigger('zoom', 1);
        },

        zoomOut: function () {
            this.trigger('zoom', -1);
        },

        panDown: function () {
            this.trigger('pan', 0, 1);
        },

        panUp: function () {
            this.trigger('pan', 0, -1);
        },

        panRight: function () {
            this.trigger('pan', 1, 0);
        },

        panLeft: function () {
            this.trigger('pan', -1, 0);
        }
    });
});