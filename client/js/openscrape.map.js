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
    './openscrape.alert',
    './openscrape.geocoder',
    'lib/jquery',
    'lib/underscore',
    'lib/google',
    'lib/json2'
], function (alert, Geocoder,
             $, _, google, JSON) {
    "use strict";

    return (function () {
        /**
         * Save current diagonal measurement.
         */
        var saveDiagonal = function () {
            var bounds = this.gMap.getBounds(),
                curCenter = bounds.getCenter(),
                curNorthEast = bounds.getNorthEast();

            this.diagonal =
                Math.sqrt(Math.pow(curCenter.lng() - curNorthEast.lng(), 2) +
                          Math.pow(curCenter.lat() - curNorthEast.lat(), 2));
        },

            /**
             *  Do something only the first time the map is loaded
             */
            onLoad = function (evt) {
                saveDiagonal.call(this);
            },

            /**
             * Resolve single clicks with single address objects.
             */
            onClick = function (evt) {
                var latLng = evt.latLng;

                this.dblClickWait = setTimeout(_.bind(function () {
                    this.geocoder.reverseGeocode(latLng.lat(), latLng.lng())
                        .done(_.bind(function (address) {
                            _.each(this.addressListeners, function (listener) {
                                listener.call(this, evt);
                            });
                        }, this)).fail(function (message) {
                            alert.warn('Could not reverse geocode: ' + message);
                        });
                }, this), this.dblClickWaitTime);
            },

            /**
             * Prevent single-click from firing on double-click
             */
            onDblClick = function (evt) {
                clearTimeout(this.dblClickWait);
            },

            /**
             * Keep track of current zoom level
             */
            onBoundsChanged = function (evt) {
                var lastDiagonal = this.diagonal,
                    ratio;

                saveDiagonal.call(this);

                ratio = lastDiagonal / this.diagonal;

                _.each(this.zoomChangedListeners, function (listener) {
                    listener.call(this, ratio);
                });
            };

        /**
         * Initialize a map.
         *
         * @param elem The DOM element to use for the map.
         * @param initialLat The float latitude to start centered on.
         * @param initialLng The float longitude to start centered on.
         * @param zoom The integer zoom to start at.
         */
        function Map(elem, initialLat, initialLng, zoom) {
            var center = new google.maps.LatLng(initialLat, initialLng),
                map = new google.maps.Map(elem, {
                    center: center,
                    zoom: zoom,
                    mapTypeControl: false,
                    streetViewControl: false,
                    mapTypeId: google.maps.MapTypeId.TERRAIN
                });
            //this.getBounds = _.bind(map.getBounds, map);
            this.gMap = map;

            this.geocoder = new Geocoder();
            this.loadListeners = [];
            this.addressListeners = [];
            this.zoomChangedListeners = [];
            this.dblClickWaitTime = 500;

            this.addLoadListener = _.bind(this.addLoadListener, this);
            this.addAddressListener = _.bind(this.addAddressListener, this);
            this.addZoomChangedListener = _.bind(this.addZoomChangedListener, this);

            // Thanks to http://stackoverflow.com/questions/832692
            google.maps.event.addListenerOnce(map, 'idle', _.bind(onLoad, this));
            google.maps.event.addListener(map, 'click', _.bind(onClick, this));
            google.maps.event.addListener(map, 'dblclick', _.bind(onDblClick, this));
            google.maps.event.addListener(map, 'bounds_changed', _.bind(onBoundsChanged, this));
        }

        /**
         * Add a listener for when the map is loaded.
         *
         * @param {function} listener That will be called with the {Map} as
         *  this, and an {Event} argument.
         *
         * @return this
         */
        Map.prototype.addLoadListener = function (listener) {
            this.loadListeners.push(listener);
            return this;
        };

        /**
         * Add a listener for when the map is clicked once, but not twice.
         *
         * @param {function} listener That will be called with the {Map} as
         *  this, and an {openscrape.Address} argument.
         *
         * @return this
         */
        Map.prototype.addAddressListener = function (listener) {
            this.addressListeners.push(listener);
            return this;
        };

        /**
         * Add a listener for when the zoom of the map changes.
         *
         * @param {function} listener That will be called with the {Map} as
         * this, and a ratio fraction describing how the zoom changed.  It
         *  would be 2 if the zoom doubled, .5 if it halved.
         *
         * @return this
         */
        Map.prototype.addZoomChangedListener = function (listener) {
            this.zoomChangedListeners.push(listener);
            return this;
        };

        return Map;
    }());
});