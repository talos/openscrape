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
    'views/openscrape.caustic.prompt',
    'openscrape.caustic.proxy',
    'openscrape.caustic.applet',
    'lib/json2',
    'lib/underscore',
    '../helpers',
    'lib/jquery'
], function (require, CausticCollection, CausticPromptView, proxy, applet,
             json, _) {
    "use strict";

    var $ = require('jquery'),
        resp = json.stringify({
            id: 'id',
            status: 'failed'
        });

    describe("CausticPromptView", function () {

        var choose = function (button) {
            var $button = this.prompt.$el.find('input[value="' + button + '"]');
            $button.length.should.not.equal(0);
            $button.click();
        };

        beforeEach(function () {
            this.collection = new CausticCollection();
            this.prompt = new CausticPromptView({
                collection: this.collection
            });
            this.choose = _.bind(choose, this);
        });

        afterEach(function () {
            this.collection = null;
            this.prompt.remove();
        });

       //  it('should prompt the user whether to use the proxy or applet', function () {
       //      this.collection.fetch();
       //      this.expect(this.prompt.$el.text()).to.match(/proxy/i);
       //      this.expect(this.prompt.$el.text()).to.match(/applet/i);
       //  });

        describe('if they choose the proxy', function () {

            beforeEach(function () {
                this.collection.fetch();
                sinon.stub(proxy, 'request').returns(new $.Deferred().resolve(resp));

                this.choose('Proxy');
            });

            afterEach(function () {
                proxy.request.restore();
            });

            it('should dismiss the prompt', function () {
                this.clock.tick(500);
                this.expect(this.$dom.html()).to.be.empty;
            });

            it('should request from the proxy', function () {
                var model = this.collection.create({
                    foo: 'bar'
                });
                model.fetch();
                proxy.request.should.have.been.calledOnce;
                proxy.request.should.have.been.calledWith('{"foo":"bar"}');
            });
        });

        describe('if they choose the applet', function () {

            beforeEach(function () {
                sinon.stub(applet, 'enable').returns($.Deferred().resolve());
                sinon.stub(applet, 'request');
                this.collection.fetch();
            });

            afterEach(function () {
                applet.request.restore();
                applet.enable.restore();
            });

            it('should dismiss the prompt', function () {
                this.choose('Applet');
                this.clock.tick(500);
                this.expect(this.$dom.html()).to.be.empty;
            });

            it('should enable the applet', function () {
                this.choose('Applet');
                applet.enable.should.have.been.calledOnce;
            });

            it('should request from the applet', function () {
                this.choose('Applet');
                applet.request.should.have.been.caledOnce;
            });

            it('should warn the user and use the proxy if the applet won\'t enable', function () {
                applet.enable.returns($.Deferred().reject());

                this.choose('Applet');

                var $warning = this.$dom.find('.warning');
                this.expect($warning.text()).to.match(/applet error/i);
                this.expect($warning.text()).to.match(/using proxy/i);

                applet.request.should.not.have.been.called;
                proxy.request.should.have.been.calledOnce;
                proxy.request.restore();
            });
        });
    });
});
