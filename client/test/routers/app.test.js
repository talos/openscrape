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
    'lib/backbone',
    'lib/json2',
    '../../src/views/openscrape.app',
    '../../src/routers/openscrape.app',
    '../helpers',
    'lib/jquery'
], function (require, _, backbone, json, AppView, AppRouter) {
    "use strict";

    var $ = require('jquery');

    describe("AppRouter", function () {
        before(function () {
            this.server = sinon.fakeServer.create();
        });

        beforeEach(function () {
            this.view = new AppView();
            this.router = new AppRouter({view: this.view});
            //this.$dom.show();
            this.view.render().$el.appendTo(this.$dom);

            // hashChange: false is used to prevent global leak on window event
            backbone.history.start({ pushState: true });

            this.origFrag = backbone.history.fragment;

            this.go = _.bind(function (path) {
                this.router.navigate(path, {trigger: true});
            }, this);
        });

        afterEach(function () {
            this.view.remove();
            //this.$dom.hide();
            this.router.navigate(this.origFrag, {trigger: false});
            backbone.history.stop();
        });

        after(function () {
            this.server.restore();
        });

        it("Shows a map by default", function () {
            this.go('/');
            this.clock.tick(500);
            this.$dom.find('#map').is(':visible').should.be.true;
        });

        it("Displays user's instructions if they exist", function () {
            var instruction = {'load': 'http://www.dailykos.com'};
            this.server.respondWith('GET', '/foo/instruction/bar',
                                    [200, {}, json.stringify(instruction)]);
            this.go('/foo/instruction/bar');
            this.server.respond();

            this.clock.tick(500);

            console.log(this.view.$el.text());
            this.view.$el.text().should.match(/www\.dailykos\.com/);
        });
    });
});
