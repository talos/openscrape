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
    'models/openscrape.instruction',
    'lib/json2',
    '../helpers'
], function (require, InstructionModel, json) {
    "use strict";

    var valid = [
            [],
            'string',
            { load: 'http://www.google.com' },
            { find: 'foobar' },
            { extends: 'foobar' },
            { extends: ['foo', 'bar'] },
        ],
        invalid = [
            //7, // JSV chokes on this one!
            //{ then: 'foobar' },
            //[[]],
            { foo: 'bar' },
            { load: 'http://google.com', find: 'foobar'}
        ];

    describe('InstructionModel', function () {

        it('should reject empty models', function () {
            this.expect(new InstructionModel().validate()).to.not.be.empty;
        });

        it('should pass valid models', function () {
            var i = 0, len = valid.length, model;
            while (i < len) {
                model = new InstructionModel({
                    value: valid[i]
                });
                this.expect(model.validate(),
                            json.stringify(valid[i])
                    ).to.be.a('undefined');
                i += 1;
            }
        });

        it('should reject invalid models', function () {
            var i = 0, len = invalid.length, model;
            while (i < len) {
                model = new InstructionModel({
                    value: invalid[i]
                });
                this.expect(model.validate(),
                            json.stringify(invalid[i])
                    ).to.not.be.empty;
                i += 1;
            }
        });
    });
});

