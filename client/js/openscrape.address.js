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

/*global mxn*/

var openscrape;

if (!openscrape) {
    openscrape = {}; // Define openscrape if not yet defined
}

(function () {
    "use strict";

    /**
     * Generate a new address object.
     *
     * @param number The number.  Required.
     * @param street The street name. Required.
     * @param zip The ZIP code.  Required.
     *
     * @return An address object
     */
    openscrape.address = function (number, street, zip) {
        if (!number || !street || !zip) {
            throw "Must specify number (" + number + ")"
                + " street (" + street + ") and zip (" + zip + ")";
        } else {
            return {
                number: number,
                street: street,
                zip: zip
            };
        }
    };
}());