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
    '../openscrape.geocoder',
    '../openscrape.zip2borough',
    '../openscrape.store'
], function (_, backbone, geocoder, zip2borough, Store) {
    "use strict";

    return backbone.Model.extend({

        initialize: function () {
            if (!this.has('lat') || !this.has('lng')) {
                throw "Missing lng/lat for marker";
            }

            if (!this.has('address')) {
                this.lookupAddress(this.lat(), this.lng());
            }
        },

        address: function () {
            return this.get('address');
        },

        lookupAddress: function (lat, lng) {
            geocoder.reverseGeocode(lat, lng)
                .done(_.bind(function (address) {

                    // TODO
                    address.apt = '';
                    address.borough = zip2borough(address.zip);
                    address.Borough = address.borough;

                    if (!address.borough) {
                        this.trigger('error',
                                     "Sorry, that selection is not in the five boroughs.");
                        this.destroy();
                    } else {
                        this.save({ address: address });
                    }
                }, this))
                .fail(_.bind(function (reason) {
                    this.trigger('error', reason);
                    this.destroy();
                }, this));
        },

        lat: function () {
            return this.get('lat');
        },

        lng: function () {
            return this.get('lng');
        },

        nodeId: function () {
            return this.get('nodeId');
        },

        saveNodeId: function (nodeId) {
            this.save('nodeId', nodeId);
        },

        /**
         * Trigger a visualization at x/y.
         *
         * @param x The x location to trigger the visual
         * @param y The y location to trigger the visual
         */
        visualize: function (x, y) {
            if (this.has('address')) {
                this.trigger('visualize', this, this.get('address'), x, y);
            }
        }
    });
});