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

        lng: function () {
            return this.get('lng');
        },

        lat: function () {
            return this.get('lat');
        },

        zoom: function () {
            return this.get('zoom');
        },

        focus: function () {
            this.trigger('focus');
        },

        /**
         * Manually zoom the map in or out.
         *
         * @param inOut Positive to zoom in, negative to zoom out.
         */
        zoomInOut: function (inOut) {
            this.save('zoom', this.zoom() + (inOut > 0 ? 1 : -1));
        },

        /**
         * Manually pan the map
         */
        pan: function (leftRight, upDown) {
            // todo this is all wrong
            if (leftRight !== 0) {
                this.save('lat', this.lat() * (leftRight > 0 ? 1.2 : -1.2));
            } else {
                this.save('lng', this.lng() * (upDown > 0 ? 1.2 : -1.2));
            }
        }
    });
});