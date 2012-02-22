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
    'lib/underscore',
    'lib/backbone',
    '../openscrape.address',
    '../openscrape.zip2borough',
    'collections/openscrape.nodes'
], function (_, backbone, Address, NodesCollection) {
    "use strict";

    return backbone.Model.extend({

        // validate: function (attrs) {
        //     // console.log('validate');
        //     // if (typeof attrs.lat !== 'number' || typeof attrs.lng !== 'number') {
        //     //     return "invalid lat/lng: " + attrs.lat + ',' + attrs.lng;
        //     // }

        //     // console.log(attrs);
        //     // if (attrs.address.constructor !== Address) {
        //     //     return "invalid address: " + attrs.address;
        //     // }

        //     // return undefined;
        // },

        lat: function () {
            return this.get('lat');
        },

        lng: function () {
            return this.get('lng');
        },

        address: function () {
            //console.log(this);
            //console.log(this.get('address').constructor);
            return new Address(this.get('address'));
        },

        title: function () {
            return this.address().toString();
        }
    });
});