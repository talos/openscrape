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

/*jslint nomen:true*/
/*globals define, sinon, before, beforeEach, afterEach, after, describe, it*/

define([
    'require',
    'lib/underscore',
    'lib/json2',
    '../helpers'
], function (require, _, json, OAuthModel, UserModel, InstructionModel,
             InstructionView) {
    "use strict";

    before(function () {
        this.xhr = sinon.useFakeXMLHttpRequest();
        this.xhr.onCreate = function (xhr) {
            xhr.async = false; // spare us having to call respond manually
        };
        this.clock = sinon.useFakeTimers();
        this.server = sinon.fakeServer.create();
    });

    after(function () {
        this.server.restore();
        this.xhr.restore();
        this.clock.restore();
    });

    describe("Openscrape App", function () {

        it("Shows a map by default", function () {

        });

        it("Displays user's instructions", function () {
            

        });

    });
});
