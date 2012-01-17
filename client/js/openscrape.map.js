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

/*global define*/

define([
    './openscrape.address',
    './openscrape.alert',
    './openscrape.data',
    './openscrape.instruction',
    './openscrape.request',
    './openscrape.visual',
    'lib/jquery',
    'lib/underscore',
    'lib/google',
    'lib/google.rich-marker'
], function (address, alert, data, instruction, request, visual,
             $, underscore, google, rich_marker) {
    "use strict";

    var map,
        geocoder,
        diagonal,
        dblClickWait, // used as a timer to block single-click event

        /**
         * Update diagonal measurement for new zoom.
         */
        updateDiagonal = function () {
            var bounds = map.getBounds(),
                curCenter = bounds.getCenter(),
                curNorthEast = bounds.getNorthEast();

            diagonal =
                Math.sqrt(Math.pow(curCenter.lng() - curNorthEast.lng(), 2) +
                          Math.pow(curCenter.lat() - curNorthEast.lat(), 2));
        },

        /**
         *  Do something only the first time the map is loaded
         */
        onLoad = function (evt) {
            updateDiagonal();
        },

        /**
         * Set up click listener to create markers.
         */
        onClick = function (evt) {
            var latLng = evt.latLng;

            dblClickWait = setTimeout(function () {
                //openscrape.map.marker(latLng.lat(), latLng.lng(), pixel.x, pixel.y);
                map.reverseGeocode(latLng.lat(), latLng.lng())
                    .done(function (address) {
                        map.addOverlay(address, latLng);
                    }).fail(function (message) {
                        alert.warn('Could not reverse geocode: ' + message);
                    });

            }, 500); // wait .5 second to be sure it's not a double click
        },

        /**
         * Prevent single-click from firing on double-click
         */
        onDblClick = function (evt) {
            clearTimeout(dblClickWait);
        },

        /**
         * Keep track of current zoom level
         */
        onBoundsChanged = function (evt) {
            var lastDiagonal = diagonal,
                ratio;

            updateDiagonal();

            ratio = lastDiagonal / diagonal;

            if (ratio > 1.05 || ratio < 0.95) {
                console.log(ratio);
            }
        };

    return {

        /**
         * Initialize a map.
         *
         * @param elem The DOM element to use for the map.
         * @param initialLat The float latitude to start centered on.
         * @param initialLng The float longitude to start centered on.
         * @param zoom The integer zoom to start at.
         */
        init: function (elem, initialLat, initialLng, zoom, instruction) {

            map = new google.maps.Map(elem, {
                center: new google.maps.LatLng(initialLat, initialLng),
                zoom: zoom,
                mapTypeId: google.maps.MapTypeId.ROADMAP
            });
            geocoder = new google.maps.Geocoder();

            google.maps.event.addListener(map, 'click', onClick);
            google.maps.event.addListener(map, 'dblclick', onDblClick);
            google.maps.event.addListener(map, 'bounds_changed', onBoundsChanged);
            // Thanks to http://stackoverflow.com/questions/832692/how-to-check-if-google-maps-is-fully-loaded
            google.maps.event.addListenerOnce(map, 'idle', onLoad);
        },

        /**
         * Add an overlay for an address visualization.
         *
         * @param address The address to visualize.
         * @param latLng The latLng to add the overlay at.
         */
        addOverlay: function (address, latLng) {
            var id = data.newId();

            // draw the visualization
            data.saveTags(id, address);
            request(
                id,
                instruction.property(address),
                true,
                ''
            ).done(function (resp) {
                data.saveResponse(id, resp);

                // Rich marker example @ http://google-maps-utility-library-v3.googlecode.com/svn/trunk/richmarker/examples/richmarker.html?compiled
                var overlay = new rich_marker.RichMarker({
                    map: map,
                    position: latLng,
                    flat: true, // this just controls... shadow
                    anchor: rich_marker.RichMarkerPosition.MIDDLE,
                    content: visual.draw(id)
                });

                // Re-scale this overlay upon zoom
                console.log('adding zoom listener');
                google.maps.event.addListener(map, 'zoom_changed', function () {
                    //glob_map = map;
                    console.log('zoom changed');
                });

            });
        },

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
        reverseGeocode: function (lat, lng) {
            var dfd = new $.Deferred(),
                latlng = new google.maps.LatLng(lat, lng);

            geocoder.geocode({ 'latLng': latlng }, function (results, status) {
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
        }
    };
});