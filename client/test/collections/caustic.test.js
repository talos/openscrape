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
    '../helpers',
    'lib/jquery'
], function (require, CausticCollection, CausticModel, proxy, _, json) {
    "use strict";

    var $ = require('jquery');

    describe("CausticCollection", function () {

        before(function () {
            this.collection = new CausticCollection();
            this.collection.enable(proxy.request);
        });

        beforeEach(function () {
            this.server = sinon.fakeServer.create();
        });

        afterEach(function () {
            this.server.restore();
        });

        it("constructs a single model for a childless response", function () {
            var request = {
                    'id': 'foobar',
                    'force': true,
                    'instruction': { 'load': 'http://www.google.com' }
                },
                response = {
                    'id': 'foobar',
                    'name': 'google',
                    'description': '',
                    'uri': 'uri',
                    'status': 'loaded',
                    'instruction': request.instruction,
                    'results': [{
                        'value': 'contents of google'
                    }]
                },
                model;
            this.server.respondWith('POST', '/proxy',
                                    [200, {}, json.stringify(response)]);

            model = this.collection.create(request);
            this.server.respond();
            model.id.should.equal('foobar');
            this.expect(model.get('parent')).to.not.be.ok;
            this.expect(model.get('name')).to.equal('google');
            this.expect(model.get('uri')).to.equal('uri');
            this.expect(model.get('status')).to.equal('loaded');
            this.expect(model.get('instruction')).to.eql(response.instruction);
            this.expect(model.get('results')).to.eql(response.results);
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
            }, inner, outer;
            this.server.respondWith('POST', '/proxy',
                                    [200, {}, json.stringify(response)]);

            outer = this.collection.create({});
            this.server.respond();
            outer.id.should.equal('outer');
            inner = outer.get('results')[0].children[0];
            this.expect(inner.get('id')).to.equal('inner');
            this.expect(inner.get('name')).to.equal('foo');
            this.expect(inner.get('uri')).to.equal('http://proxy/');
            this.expect(inner.get('status')).to.equal('found');
            this.expect(inner.get('instruction')).to.eql(
                response.results[0].children[0].instruction
            );
            this.expect(inner.get('results')).to.eql(
                response.results[0].children[0].results
            );

        });
    });
});
