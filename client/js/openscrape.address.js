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

/*globals define*/

define(function () {
    "use strict";

    return (function () {

        /**
         * Generate a new address object.
         *
         * @param number The number.
         * @param street The street name.
         * @param zip The ZIP code.
         * @param lat The latitude.
         * @param lng The longitude.
         */
        function Address(number, street, zip, lat, lng) {
            this.number = number;
            this.street = street;
            this.zip = zip;
            this.lat = lat;
            this.lng = lng;
        }

        return Address;
    }());
});