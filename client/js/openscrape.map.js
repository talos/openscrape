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

/*jslint browser: true,  nomen: true*/
/*global jQuery, google, _*/

var openscrape;

if (!openscrape) {
    openscrape = {}; // Define openscrape if not yet defined
}

(function ($) {
    "use strict";

    var map,
        geocoder;

    openscrape.map = {

        /**
         * Initialize a map.
         *
         * @param elem The DOM element to use for the map.
         * @param initialLat The float latitude to start centered on.
         * @param initialLng The float longitude to start centered on.
         * @param zoom The integer zoom to start at.
         */
        init: function (elem, initialLat, initialLng, zoom, instruction) {
            var dblClickWait; // used as a timer to block single-click event

            map = new google.maps.Map(elem, {
                center: new google.maps.LatLng(initialLat, initialLng),
                zoom: zoom,
                mapTypeId: google.maps.MapTypeId.ROADMAP
            });
            geocoder = new google.maps.Geocoder();

            // Set up click listener to create markers.
            google.maps.event.addListener(map, 'click', function (evt) {
                console.log("MAP EVENT HIT");

                var latLng = evt.latLng;

                dblClickWait = setTimeout(function () {
                    //openscrape.map.marker(latLng.lat(), latLng.lng(), pixel.x, pixel.y);
                    openscrape.map.reverseGeocode(latLng.lat(), latLng.lng())
                        .done(function (address) {
                            openscrape.map.addOverlay(address, latLng);
                        }).fail(function (message) {
                            openscrape.alert.warn('Could not reverse geocode: ' + message);
                        });

                }, 500); // wait .5 second to be sure it's not a double click
            });

            google.maps.event.addListener(map, 'dblclick', function (evt) {
                clearTimeout(dblClickWait);
            });
        },

        /**
         * Add an overlay for an address visualization.
         *
         * @param address The address to visualize.
         * @param latLng The latLng to add the overlay at.
         */
        addOverlay: function (address, latLng) {
            var id = openscrape.data.newId();

            // draw the visualization
            openscrape.data.saveTags(id, address);
            openscrape.request(
                id,
                openscrape.instruction.property(address),
                true,
                ''
            ).done(function (resp) {
                openscrape.data.saveResponse(id, resp);

                // Rich marker example @ http://google-maps-utility-library-v3.googlecode.com/svn/trunk/richmarker/examples/richmarker.html?compiled
                var overlay = new window.RichMarker({
                    map: map,
                    position: latLng,
                    flat: true, // this just controls... shadow
                    anchor: window.RichMarkerPosition.MIDDLE,
                    content: openscrape.visual.draw(id)
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
                    _.each(results, function (raw) {
                        var number,
                            street,
                            zip;

                        // only return precise street addresses
                        if (_.include(raw.types, 'street_address')) {
                            _.each(raw.address_components, function (component) {
                                if (_.include(component.types, 'street_number')) {
                                    number = component.long_name;
                                }
                                if (_.include(component.types, 'route')) {
                                    street = component.long_name;
                                }
                                if (_.include(component.types, 'postal_code')) {
                                    zip = component.long_name;
                                }
                            });

                            if (number && street && zip) {
                                addresses.push(openscrape.address(number, street, zip));
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
}(jQuery));
