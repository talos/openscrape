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
    'require',
    'lib/underscore',
    'lib/google',
    'lib/json2',
    'lib/jquery'
], function (require, _, google, json) {
    "use strict";

    var $ = require('jquery');

    function Geocoder() {
        this.geocoder = new google.maps.Geocoder();
        _.bind(this.reverseGeocode, this);
    }

    /**
     * Geocode an address to obtain a longitude and latitude.
     *
     * @param address The address to geocode
     * @param southWestLat
     * @param southWestLng
     * @param northEastLat
     * @param northEastLng
     *
     * @return {Promise} that will be resolved with a JS object with lat lng
     * in the format {lat: <lat>, lng: <lng>} or rejected with an error message
     * if there was a problem.
     */
    Geocoder.prototype.geocode = function (address, southWestLat, southWestLng,
                                           northEastLat, northEastLng) {
        var dfd = new $.Deferred();

        this.geocoder.geocode(
            {
                address: address,
                bounds: new google.maps.LatLngBounds(
                    new google.maps.LatLng(southWestLat, southWestLng),
                    new google.maps.LatLng(northEastLat, northEastLng)
                )
            },
            function (results, status) {
                if (status === google.maps.GeocoderStatus.OK) {
                    var result = _.find(results, function (result) {
                        return result.location_type === google.maps.GeocoderLocationType.ROOFTOP;
                    });
                    if (result) {
                        dfd.resolve({lat: result.location.lat(),
                                     lng: result.location.lng()});
                    }
                }
                dfd.reject("Couldn't find address: " + status);
            }
        );

        return dfd.promise();
    };

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