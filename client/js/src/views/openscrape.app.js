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
    'models/openscrape.map',
    'views/openscrape.map',
    'lib/backbone',
    'lib/requirejs.mustache',
    'text!templates/main.mustache'
], function (MapModel, MapView, backbone, mustache,
             mainTemplate) {
    "use strict";

    return backbone.View.extend({
        initialize: function () {
            this.$el.html(mustache.render(mainTemplate, this.model.toJSON()));
            var mapModel = new MapModel({
                lat: 40.77,
                lng: -73.98
            }),
                mapView = new MapView({
                    model: mapModel,
                    el: this.$el.find('#map')
                });
            this.$help = this.$el.find('#help').hide();
            this.model.on('change', this.render, this);
        },

        render: function () {
            if (this.model.location() === 'help') {
                this.$help.slideDown();
            } else {
                this.$help.slideUp();
            }
        }
    });
});