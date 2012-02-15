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
    'lib/backbone',
    '../openscrape.store'
], function (backbone, Store) {
    "use strict";

    return backbone.Model.extend({
        store: new Store('map'),

        defaults: function () {
            return {
                lat: 40.77,
                lng: -73.98,
                zoom: 11
            };
        },

        lng: function () {
            return this.get('lng');
        },

        lat: function () {
            return this.get('lat');
        },

        zoom: function () {
            return this.get('zoom');
        }
    });
});