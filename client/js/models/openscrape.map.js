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
    'lib/google',
    'lib/underscore',
    'lib/backbone',
    '../openscrape.store'
], function (google, _, backbone, Store) {
    "use strict";

    return new (backbone.Model.extend({
        defaults: {
            loaded: false,
            scale: 1
        },

        store: new Store('map'),

        initialize: function () {
            this.on('change:diagonal', function () {
                if (this.previous('diagonal')) {
                    var ratio = this.previous('diagonal') / this.get('diagonal'),
                        newScale = this.get('scale') * ratio;

                    if (ratio > 1.1 || ratio < 0.9) {
                        this.save('scale', newScale);
                    }
                }
            }, this);
        },

        saveBounds: function (centerLat, centerLng, northEastLat, northEastLng) {
            this.save('diagonal', Math.sqrt(Math.pow(centerLng - northEastLng, 2) +
                                            Math.pow(centerLat - northEastLat, 2)));
        }
    }))();
});