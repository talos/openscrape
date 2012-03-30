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

/*globals define, beforeEach, describe, it*/
// if (typeof define !== 'function') {
//     var define = require('amdefine')(module);
// }
// var requirejs = require('requirejs');
// requirejs.config({
//     //Pass the top-level main.js/index.js require
//     //function to requirejs so that node modules
//     //are loaded relative to the top-level JS file.
//     nodeRequire: require,
//     baseUrl: '../src'
// });

define([
    'collections/openscrape.nodes',
    'models/openscrape.node',
    '../helpers'
], function (NodesCollection, NodeModel, chai) {
    "use strict";
    var collection;
    describe('Node Model', function () {

        beforeEach(function () {
            collection = new NodesCollection();
        });
    });
});
