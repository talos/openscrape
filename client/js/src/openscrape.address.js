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
    'lib/underscore'
], function (_) {
    "use strict";

    return (function () {

        /**
         * Construct a new address.  The options hash must contain a
         * number, street, zip, lat, and lng.
         */
        function Address(options) {
            if (_.has(options, 'number') && _.has(options, 'street') && _.has(options, 'zip')) {
                _.extend(this, options);
            } else {
                throw "Invalid options for address: " + options;
            }
        }

        /**
         * Compare the address to another object.
         *
         * @param address Another address.
         *
         * @return {Boolean} true if they are the same address, false otherwise.
         */
        Address.prototype.equals = function (address) {
            if (address.constructor === Address) {
                return _.isEqual(this.toJSON(), address.toJSON());
            }
            return false;
        };

        /**
         * Convert the address to a string.
         *
         * @return {String}
         */
        Address.prototype.toString = function () {
            return [this.number, this.street, this.zip].join(' ');
        };

        /**
         * Convert this address back to a vanilla JS object.
         *
         * @return {Object}
         */
        Address.prototype.toJSON = function () {
            return {
                number: this.number,
                street: this.street,
                zip: this.zip
            };
        };

        return Address;
    }());
});