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
    'models/openscrape.oauth',
    'models/openscrape.user',
    'models/openscrape.instruction',
    'views/openscrape.instruction',
    '../helpers'
], function (require, _, json, OAuthModel, UserModel, InstructionModel,
             InstructionView) {
    "use strict";

    var user = new UserModel({ name: 'talos' }),
        name = 'bar',
        tags = ['fun', 'interesting'],
        value = { 'load': 'http://www.google.com' },
        respHeaders = { 'Content-Type': 'application/json' };

    describe("InstructionView", function () {

        before(function () {
            this.server = sinon.fakeServer.create();
        });

        beforeEach(function () {
            this.model = new InstructionModel({
                user: user,
                name: name,
                tags: tags,
                value: value
            });
            this.view = new InstructionView({
                model: this.model
            }).render();
            this.view.$el.appendTo(this.$dom);
            this.server.respond();
        });

        afterEach(function () {
        });

        after(function () {
            this.server.restore();
        });

        it("shows the name of the instruction", function () {
            this.view.$el.text().should.match(new RegExp(name));
        });

        it("shows the creator's name", function () {
            this.view.$el.text().should.match(new RegExp(user.name()));
        });

        it("displays the tags", function () {
            _.each(tags, _.bind(function (tag) {
                this.view.$el.text().should.match(new RegExp(tag));
            }, this));
        });

        it("doesn't immediately display an error after pressing a key", function () {
            var input = this.view.valueInput();
            input.val('o').keydown();
            input.hasClass('invalid').should.be.false;
            this.view.$el.find('#errors').children().length.should.equal(0);
        });

        it("displays an error after a little bit after pressing a key", function () {
            var input = this.view.valueInput();
            input.val('o').keydown();
            this.clock.tick(510);
            input.hasClass('invalid').should.be.true;
            this.view.$el.find('#errors').children().should.not.be.empty;
        });

        it("displays an error and highlights when changed to invalid JSON", function () {
            var input = this.view.valueInput(),
                invalidJSON = '[lksdjf';
            input.val(invalidJSON).trigger('change');
            input.hasClass('invalid').should.be.true;
            this.view.model.value().should.not.eql(invalidJSON);
            this.view.model.hasChanged().should.be.false;
            this.view.$el.find('#errors').text().should.match(/bad json/i);
        });

        it("displays an error and highlights when changed to invalid value", function () {
            var input = this.view.valueInput(),
                invalidValue = {'foo': 'bar'};
            input.val(json.stringify(invalidValue)).trigger('change');
            input.hasClass('invalid').should.be.true;
            this.view.model.value().should.not.eql(invalidValue);
            this.view.model.hasChanged().should.be.false;
        });

        it("sets the model's value to match the display after a keydown and wait", function () {
            var newValue = {'load': 'http://nytimes.com/'};
            this.view.valueInput().val(json.stringify(newValue)).keydown();
            this.clock.tick(510);
            this.view.model.value().should.eql(newValue);
        });

        it("sets the model's value to match the display after change", function () {
            var newValue = {'load': 'http://nytimes.com/'};
            this.view.valueInput().val(json.stringify(newValue)).change();
            this.view.model.value().should.eql(newValue);
        });

        it("clears the errors display after a correction", function () {
            var input = this.view.valueInput(),
                spy = sinon.spy();
            input.val('[sdlkgj').change();
            input.val('"foo bar baz"').change(spy);
            input.val().should.equal('"foo bar baz"');
            input.hasClass('invalid').should.be.false;
        });

        describe("when a user is logged in", function () {

            describe("when the user is the creator", function () {
                beforeEach(function () {
                    this.server.respondWith('GET', '/oauth/status',
                                            [200, respHeaders, '{"user":"talos"}']);
                });

                it("allows them to commit changes", function () {

                });

                it("doesn't show the forking option", function () {

                });
            });

            describe("when the user in not the creator", function () {
                beforeEach(function () {
                    this.server.respondWith('GET', '/oauth/status',
                                            [200, respHeaders, '{"user":"foo"}']);
                });

                it("forbids them from commiting changes", function () {

                });

                it("allows them to fork", function () {

                });
            });
        });

        describe("when a user is not logged in", function () {

            beforeEach(function () {
                this.server.respondWith('GET', '/oauth/status',
                                        [200, respHeaders, '{}']);
            });

            it("forbids them from committing changes", function () {

            });

            it("forbids them from forking", function () {

            });
        });
    });
});

