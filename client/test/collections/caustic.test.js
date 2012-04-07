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
    'collections/openscrape.caustic',
    'models/openscrape.caustic',
    'openscrape.caustic.proxy',
    'lib/underscore',
    'lib/json2',
    '../../helpers',
    'lib/jquery'
], function (require, CausticCollection, CausticModel, proxy, _, json) {
    "use strict";

    var $ = require('jquery');

    describe("CausticCollection", function () {

        before(function () {
            this.collection = new CausticCollection();
            this.collection.enable(proxy);
        });

        beforeEach(function () {
        });

        afterEach(function () {
        });

        it("constructs a single model for a childless response", function () {
            var request = {
                    'id': 'foo',
                    'force': true,
                    'instruction': { 'load': 'http://www.google.com' }
                },
                response = {
                    'id': 'foo',
                    'name': 'google',
                    'description': '',
                    'uri': 'uri',
                    'status': 'loaded',
                    'instruction': request.instruction,
                    'results': [{
                        'value': 'contents of google'
                    }]
                };
            this.server.respondWith('POST', '/proxy', function (xhr) {
                xhr.respond(200, {}, json.stringify(response));
            });

            this.model = this.collection.create(request);
            this.model.id.should.equal('foo');
            this.model.fetch();
            this.model.parent().should.not.be.ok;
            this.model.name().should.equal('google');
            this.model.uri().should.equal('uri');
            this.model.status().should.equal('loaded');
            this.model.instruction().value.should.eql(response.instruction);
            this.model.results().should.eql(response.results);
        });

        it("constructs a nested model for a response with children", function () {
            var response = {
                'id': 'outer',
                'name': 'google',
                'uri': 'http://proxy/',
                'status': 'loaded',
                'instruction': {'load': 'google', 'then': {'find': 'foo'}},
                'results': [{
                    'value': 'contents of google',
                    'children': [{
                        'id': 'inner',
                        'name': 'foo',
                        'uri': 'http://proxy/',
                        'status': 'found',
                        'instruction': {'find': 'foo'},
                        'results': [{
                            'value': 'foo'
                        }]
                    }]
                }]
            };

        });
    });
});
