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

    return {

        /**
         * Get an instruction relevant for obtaining property info.
         *
         * @param address The openscrape.address of the property.
         */
        property: function (address) {
            //return "http://accursedware.com:6767/" + address.zip + '/';
            return window.location.origin +
                window.location.pathname
                + "instructions/nyc/property.json";
        }
    };
});