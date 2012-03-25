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
    'lib/underscore',
    'lib/backbone',
    '../openscrape.localsync',
    'models/openscrape.marker'
], function (_, backbone, LocalSync, MarkerModel) {
    "use strict";

    return backbone.Collection.extend({
        model: MarkerModel,
        sync: new LocalSync('markers'),

        /**
         * Find a marker by lat/lng.
         *
         * @param lat {Number} the latitude
         * @param lng {Number} the longitude
         *
         * @return {openscrape.MarkerModel} a marker, or null if there is none.
         */
        findByLatLng: function (lat, lng) {
            return this.find(function (marker) {
                return marker.lat() === lat && marker.lng() === lng;
            });
        },

        /**
         * Find a marker by address.
         *
         * @param address
         *
         * @return {openscrape.MarkerModel} a marker, or null if there is none.
         */
        findByAddress: function (address) {
            return this.find(function (marker) {
                return marker.address().equals(address);
            });
        }
    });
});
