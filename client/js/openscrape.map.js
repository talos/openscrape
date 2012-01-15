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
/*global jQuery, google, _*/

var openscrape;

if (!openscrape) {
    openscrape = {}; // Define openscrape if not yet defined
}

(function ($) {
    "use strict";

    var map,
        geocoder,
        infowindow;

    openscrape.map = {

        /**
         * Initialize a map.
         *
         * @param elem The DOM element to use for the map.
         * @param lat The float latitude to start centered on.
         * @param lng The float longitude to start centered on.
         * @param zoom The integer zoom to start at.
         */
        init: function (elem, lat, lng, zoom) {
            map = new google.maps.Map(elem, {
                center: new google.maps.LatLng(lat, lng),
                zoom: zoom,
                mapTypeId: google.maps.MapTypeId.ROADMAP
            });
            geocoder = new google.maps.Geocoder();
            infowindow = new google.maps.InfoWindow();

            // Set up click listener to create markers.
            google.maps.event.addListener(map, 'click', function (evt) {
                var latLng = evt.latLng;
                openscrape.map.marker(latLng.lat(), latLng.lng());
            });
        },

        /**
         * Create a marker on the map, once reverse geocoding is done.
         *
         * @param lat The float latitude where to place the marker.
         * @param lng The float longitude where to place the marker.
         */
        marker: function (lat, lng) {
            openscrape.map.reverseGeocode(lat, lng)
                .done(function (address) {
                    var marker = new google.maps.Marker({
                        position: new google.maps.LatLng(lat, lng),
                        map: map
                    });
                    google.maps.event.addListener(marker, 'click', function (evt) {

                        // TODO
                        infowindow.setContent(JSON.stringify(address));
                        infowindow.open(map, marker);
                    });
                }).fail(function (message) {
                    openscrape.alert.warn('Could not create marker: ' + message);
                });
        },

        /**
         * Reverse geocode a latitude/longitude, to obtain an address.
         *
         * @param lat The float latitude to reverse geocode.
         * @param lng The float longitude to reverse geocode.
         *
         * @return A Promise that will be resolved with a single
         * openscrape.addresses when successful, or rejected with
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
                        dfd.resolve(addresses);
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
