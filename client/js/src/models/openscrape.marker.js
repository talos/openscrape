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
    '../openscrape.zip2borough'
], function (_, backbone, zip2borough) {
    "use strict";

    return backbone.Model.extend({

        validate: function (attrs) {
            if (typeof attrs.latLng.lat !== 'number' || typeof attrs.latLng.lng !== 'number') {
                return "invalid lat/lng: " + attrs.latLng.lat + ',' + attrs.latLng.lng;
            }

            attrs.address.apt = '';
            attrs.address.borough = zip2borough(attrs.address.azip);
            attrs.address.Borough = attrs.address.borough;

            if (!attrs.address.borough) {
                return "Sorry, that selection is not in the five boroughs.";
            }

            return undefined;
        },

        latLng: function () {
            return this.get('latLng');
        },

        address: function () {
            return this.get('address');
        }
    });
});