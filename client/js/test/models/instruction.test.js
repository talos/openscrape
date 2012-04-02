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

/*globals define, sinon, beforeEach, afterEach, describe, it*/

define([
    'require',
    'models/openscrape.user',
    'models/openscrape.instruction',
    'lib/json2',
    '../helpers'
], function (require, UserModel, InstructionModel, json) {
    "use strict";

    var valid = [
            [],
            'string',
            { load: 'http://www.google.com' },
            { find: 'foobar' },
            { extends: 'foobar' },
            { extends: ['foo', 'bar'] },
            { load: 'http://www.google.com', then: { find: 'foobar' } }
        ],
        invalid = [
            7,
            //{},
            //{ then: 'foobar' },
            [[]],
            { foo: 'bar' },
            { load: 'http://google.com', find: 'foobar'}
        ];

    describe('InstructionModel', function () {

        beforeEach(function () {
            this.server = sinon.fakeServer.create();
            this.user = new UserModel();
            sinon.stub(this.user, 'name').returns('stubby');
        });

        afterEach(function () {
            this.server.restore();
            this.user.name.restore();
        });

        it('should reject if no user', function () {
            this.expect(new InstructionModel({
                name: 'name',
                value: valid[0]
            }).validate()).to.not.be.empty;
        });

        it('should reject if no name', function () {
            this.expect(new InstructionModel({
                user: this.user,
                value: valid[0]
            }).validate()).to.not.be.empty;
        });

        it('should reject if no value', function () {
            this.expect(new InstructionModel({
                user: this.user,
                name: 'name'
            }).validate()).to.not.be.empty;
        });

        it('should pass valid models', function () {
            var i = 0, len = valid.length, model;
            while (i < len) {
                model = new InstructionModel({
                    user: this.user,
                    name: 'name',
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
                    user: this.user,
                    name: 'name',
                    value: invalid[i]
                });
                this.expect(model.validate(),
                            json.stringify(invalid[i])
                    ).to.not.be.empty;
                i += 1;
            }
        });

        it('should persist via PUT to /instructions/{username}/{name}', function () {
            this.server.respondWith('PUT', '/instructions/stubby/foo', [200, {}, ""]);
            var model = new InstructionModel({
                id: 'tsk',
                user: this.user,
                name: 'foo',
                value: valid[0]
            }),

                resp = model.save();
            resp.isResolved().should.be.false;
            this.server.respond();
            resp.isResolved().should.be.true;
        });
    });
});

