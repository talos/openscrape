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

/*jslint browser: true*/
/*global define*/

define([
    './openscrape.address',
    './openscrape.alert',
    './openscrape.instruction',
    './openscrape.request',
    'lib/jquery',
    'lib/underscore',
    'lib/google',
    'lib/google.rich-marker',
    'lib/json2'
], function (address, alert, instruction, request,
             $, underscore, google, rich_marker, JSON) {
    "use strict";

    return (function () {

        /**
         * Initialize a map.
         *
         * @param elem The DOM element to use for the map.
         * @param visual {openscrape.Visual} the visual.
         * @param initialLat The float latitude to start centered on.
         * @param initialLng The float longitude to start centered on.
         * @param zoom The integer zoom to start at.
         */
        function Map(elem, visual, initialLat, initialLng, zoom) {
            var center = new google.maps.LatLng(initialLat, initialLng),
                map = new google.maps.Map(elem, {
                    center: center,
                    zoom: zoom,
                    streetViewControl: false,
                    mapTypeId: google.maps.MapTypeId.TERRAIN
                }),
                visContainer = document.createElement('div');
            this.geocoder = new google.maps.Geocoder();
            this.getBounds = underscore.bind(map.getBounds, map);
            this.visual = visual;
            this.visual.appendTo(visContainer);

            this.overlay = new rich_marker.RichMarker({
                map: map,
                visible: false,
                flat: true,
                position: center,
                anchor: rich_marker.RichMarkerPosition.MIDDLE,
                content: visContainer
            });

            //underscore.bindAll(this);
            this.onLoad = underscore.bind(this.onLoad, this);
            this.onClick = underscore.bind(this.onClick, this);
            this.onDblClick = underscore.bind(this.onDblClick, this);
            this.reverseGeocode = underscore.bind(this.reverseGeocode, this);
            this.onBoundsChanged = underscore.bind(this.onBoundsChanged, this);
            this.saveDiagonal = underscore.bind(this.saveDiagonal, this);
            this.createVisual = underscore.bind(this.createVisual, this);

            google.maps.event.addListener(map, 'click', this.onClick);
            google.maps.event.addListener(map, 'dblclick', this.onDblClick);
            google.maps.event.addListener(map, 'bounds_changed', this.onBoundsChanged);
            // Thanks to http://stackoverflow.com/questions/832692/how-to-check-if-google-maps-is-fully-loaded
            google.maps.event.addListenerOnce(map, 'idle', this.onLoad);

        }

        /**
         * Save current diagonal measurement.
         */
        Map.prototype.saveDiagonal = function () {
            var bounds = this.getBounds(),
                curCenter = bounds.getCenter(),
                curNorthEast = bounds.getNorthEast();

            this.diagonal =
                Math.sqrt(Math.pow(curCenter.lng() - curNorthEast.lng(), 2) +
                          Math.pow(curCenter.lat() - curNorthEast.lat(), 2));
        };

        /**
         * Switch the overlay to display a new visual.
         *
         * @param address The address to visualize.
         * @param latLng The latLng to add the overlay at.
         */
        Map.prototype.createVisual = function (address, latLng) {
            var self = this;

            request(instruction.property(address), address, {}, true, '')
                .done(function (resp) {
                    self.visual.visualize(resp);
                    self.overlay.setPosition(latLng);
                    self.overlay.setVisible(true);
                });
        };

        /**
         * Reverse geocode a latitude/longitude, to obtain an address.
         *
         * @param lat The float latitude to reverse geocode.
         * @param lng The float longitude to reverse geocode.
         *
         * @return A Promise that will be resolved with a single
         * openscrape.address when successful, or rejected with
         * an error message if there is a problem.
         */
        Map.prototype.reverseGeocode = function (lat, lng) {
            var dfd = new $.Deferred(),
                latlng = new google.maps.LatLng(lat, lng);

            this.geocoder.geocode({ 'latLng': latlng }, function (results, status) {
                var addresses;

                if (status === google.maps.GeocoderStatus.OK) {
                    addresses = [];
                    underscore.each(results, function (raw) {
                        var number,
                            street,
                            zip;

                        // only return precise street addresses
                        if (underscore.include(raw.types, 'street_address')) {
                            underscore.each(raw.address_components, function (component) {
                                if (underscore.include(component.types, 'street_number')) {
                                    number = component.long_name;
                                }
                                if (underscore.include(component.types, 'route')) {
                                    street = component.long_name;
                                }
                                if (underscore.include(component.types, 'postal_code')) {
                                    zip = component.long_name;
                                }
                            });

                            if (number && street && zip) {
                                addresses.push(address(number, street, zip));
                            }
                        }
                    });
                    if (addresses.length === 1) {
                        dfd.resolve(addresses[0]);
                    } else if (addresses.length === 0) {
                        dfd.reject("Geocoder failed: no precise addresses "
                                   + "found for (" + lat + ", " + lng + ")");
                    } else {
                        dfd.reject("Geocoder failed: several addresses "
                                   + "found for (" + lat + ", " + lng + ")"
                                   + JSON.stringify(addresses));
                    }
                } else {
                    dfd.reject("Geocoder failed: " + status);
                }
            });
            return dfd.promise();
        };

        /**
         *  Do something only the first time the map is loaded
         */
        Map.prototype.onLoad = function (evt) {
            this.saveDiagonal();
        };

        /**
         * Set up click listener to create markers.
         */
        Map.prototype.onClick = function (evt) {
            var latLng = evt.latLng,
                self = this;

            this.dblClickWait = setTimeout(function () {
                self.visual.destroy().done(function () {
                    self.reverseGeocode(latLng.lat(), latLng.lng())
                        .done(function (address) {
                            self.createVisual(address, latLng);
                        }).fail(function (message) {
                            alert.warn('Could not reverse geocode: ' + message);
                        });
                });

            }, 500); // wait .5 second to be sure it's not a double click
        };

        /**
         * Prevent single-click from firing on double-click
         */
        Map.prototype.onDblClick = function (evt) {
            clearTimeout(this.dblClickWait);
        };

        /**
         * Keep track of current zoom level
         */
        Map.prototype.onBoundsChanged = function (evt) {
            var lastDiagonal = this.diagonal,
                ratio,
                i,
                $content,
                scaled,
                height,
                width;

            this.saveDiagonal();

            ratio = lastDiagonal / this.diagonal;

            // scale overlays
            // if (ratio > 1.05 || ratio < 0.95) {
            //     for (i = 0; i < overlays.length; i += 1) {
            //         $content = $(overlays[i].content);
            //         scaled = $content.data('rescale');
            //         width = scaled ? scaled.width : $content.width();
            //         height = scaled ? scaled.height : $content.height();
            //         $content.rescale(width * ratio, height * ratio);
            //     }
            // }
        };
        return Map;
    }());
});