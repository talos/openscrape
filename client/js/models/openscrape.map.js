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
    'lib/underscore',
    'lib/backbone',
    '../openscrape.store'
], function (_, backbone, Store) {
    "use strict";

    return backbone.Model.extend({
        store: new Store('map'),

        defaults: function () {
            return {
                scale: 1,
                hideMap: false
            };
        },

        saveBounds: function (centerLat, centerLng, northEastLat, northEastLng) {
            var newDiagonal = Math.sqrt(Math.pow(centerLng - northEastLng, 2) +
                                        Math.pow(centerLat - northEastLat, 2)),
                lastDiagonal = this.get('diagonal'),
                scale = this.get('scale'),
                ratio;

            if (lastDiagonal) {
                ratio = lastDiagonal / newDiagonal;
                if (ratio > 1.1 || ratio < 0.9) {
                    scale = scale * ratio;
                }
            }

            this.save({
                lat: centerLat,
                lng: centerLng,
                diagonal: newDiagonal,
                scale: scale
            });
        }
    });
});