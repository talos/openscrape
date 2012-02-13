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
    'require',
    'lib/underscore',
    'lib/google',
    'lib/json2',
    'lib/jquery'
], function (require, underscore, google, json) {
    "use strict";

    var $ = require('jquery');

    function Geocoder() {
        this.geocoder = new google.maps.Geocoder();
        underscore.bind(this.reverseGeocode, this);
    }

    /**
     * Reverse geocode a latitude/longitude, to obtain an address.
     *
     * @param lat The float latitude to reverse geocode.
     * @param lng The float longitude to reverse geocode.
     *
     * @return {Promise} that will be resolved with a JS object with address
     * info when successful, or rejected with
     * an error message if there is a problem.
     */
    Geocoder.prototype.reverseGeocode = function (lat, lng) {
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
                            addresses.push({
                                number: number,
                                street: street,
                                zip: zip,
                                lat: lat,
                                lng: lng
                            });
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
                               + json.stringify(addresses));
                }
            } else {
                dfd.reject("Geocoder failed: " + status);
            }
        });
        return dfd.promise();
    };

    return new Geocoder();
});