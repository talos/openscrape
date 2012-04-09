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
            localStorage.clear();
            this.server = sinon.fakeServer.create();
        });

        afterEach(function () {
            this.server.restore();
            this.collection.reset();
        });

        describe("a response without children", function () {
            var response = {
                'id': 'foobar',
                'name': 'google',
                'description': '',
                'uri': 'uri',
                'status': 'loaded',
                'instruction': { 'load': 'http://www.google.com' },
                'results': [{
                    'value': 'contents of google'
                }]
            };

            beforeEach(function () {
                this.model = this.collection.create({});
                this.server.respond(json.stringify(response));
            });

            it("constructs a single model", function () {
                this.collection.length.should.equal(1);
            });

            it("fills the model with response data", function () {
                var model = this.model;
                model.id.should.equal('foobar');
                this.expect(model.get('parent')).to.not.be.ok;
                this.expect(model.get('name')).to.equal('google');
                this.expect(model.get('uri')).to.equal('uri');
                this.expect(model.get('status')).to.equal('loaded');
                this.expect(model.get('instruction')).to.eql(response.instruction);
                this.expect(model.get('results')).to.eql(response.results);
            });

            it("can retrieve the model", function () {
                var model = this.collection.get('foobar');
                model.get('name').should.equal('google');
            });

            it("persists the model across collection instances", function () {
                var collection = new CausticCollection(),
                    model;
                collection.fetch();
                collection.length.should.equal(1);
                model = collection.get('foobar');
                model.get('name').should.equal('google');
            });

            it("re-scrapes when there is a saved change", function () {
                this.model.save({'instruction': {'load': 'http://foo.bar.com/'}});
                this.server.respond(json.stringify(_.extend(response, { 'status': 'failed' })));
                this.model.get('status').should.equal('failed');
            });

        });

        describe("a response with children", function () {
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

            beforeEach(function () {
                this.model = this.collection.create({});
                this.server.respond(json.stringify(response));
            });

            it("fills the inner model with data", function () {
                this.model.id.should.equal('outer');
                var inner = this.model.get('results')[0].children[0];
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

            it("constructs two models", function () {
                this.collection.length.should.equal(2);
            });

            it("can retrieve the inner model", function () {
                var inner = this.collection.get('inner');
                inner.get('name').should.equal('foo');
            });
        });
    });
});
