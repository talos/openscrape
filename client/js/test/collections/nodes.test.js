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

/*globals define, sinon, beforeEach, describe, it*/

define([
    'require',
    'collections/openscrape.nodes',
    'openscrape.caustic',
    '../fixtures/responses',
    '../helpers',
    'lib/jquery'
], function (require, NodesCollection, caustic, responses) {
    "use strict";
    var collection,
        $ = require('jquery');
    describe('Nodes Collection', function () {

        it('should fetch via caustic from provided url', function () {
            var collection = new NodesCollection({
                url: 'http://www.somewhere.com/over/the/rainbow'
            }),
                spy = sinon.spy(caustic, 'scrape');
            spy.returns($.Deferred().resolve(responses.failed));
            collection.fetch();
            spy.should.have.been.calledWith({
                instruction: 'http://www.somewhere.com/over/the/rainbow'
            });
        });

        it('should break apart nested responses into multiple models', function () {
            //console.log(responses.complex);

        });
    });
});
