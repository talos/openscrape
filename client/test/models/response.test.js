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
/*globals define, sinon, before, beforeEach, afterEach, describe, it, expect*/

define([
    'require',
    'openscrape.caustic',
    'openscrape.models.response',
    'json!../test/fixtures/request.simple.json',
    'json!../test/fixtures/response.simple.json',
    'lib/json2',
    'lib/underscore',
    '../test/helpers',
    'lib/jquery'
], function (require, ResponseModel, Caustic, proxy, applet,
             simpleRequest, simpleResponse, json, _) {
    "use strict";

    var $ = require('jquery');

});
