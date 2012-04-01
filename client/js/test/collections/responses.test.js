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
    'openscrape.collections.responses',
    'json!../test/fixtures/request.simple.json',
    'json!../test/fixtures/response.simple.json',
    'lib/json2',
    'lib/underscore',
    '../test/helpers',
    'lib/jquery'
], function (require, Caustic, ResponseCollection,
             simpleRequest, simpleResponse, json, _) {
    "use strict";

    var $ = require('jquery');

    beforeEach(function () {
        this.caustic = new Caustic(this.$dom);
        sinon.stub(this.caustic, 'request')
            .returns(new $.Deferred().resolve(json.stringify(simpleResponse)));
    });

    afterEach(function () {
        this.caustic.request.restore();
    });

    describe('ResponseCollection', function () {

        describe('initializing', function () {
            it('should require a Caustic instance', function () {
                this.expect(new ResponseCollection()).to.throw(/must include caustic/i);
            });

            it('should initialize with a Caustic instance', function () {
                this.expect(new ResponseCollection({
                    caustic: this.caustic
                })).not.to.throw();
            });
        });

        describe('using', function () {

            beforeEach(function () {
                this.collection = (new ResponseCollection({
                    caustic: this.caustic
                }));
            });

            afterEach(function () {
                this.collection.reset();
            });

            it('should start empty', function () {
                this.expect(this.collection).to.be.empty;
            });

            describe('creating a response', function () {

                it('must be created via a request', function () {
                    this.expect(this.responses.create({})).to.throw(Error);
                });

                it('should cause a request to caustic', function () {
                    var response = this.responses.create(simpleRequest);
                });

                it('should result in the correct response', function () {

                });

            });

            describe('updating a response', function () {

                it('should be fetched when saved', function () {
                    var response = new ResponseModel(simpleRequest);
                    response.fetch();
                    this.expect(response.toJSON()).to.equal(simpleResponse);
                });

            });
        });
    });
});
