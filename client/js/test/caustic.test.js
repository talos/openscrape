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
/*globals define, sinon, beforeEach, afterEach, describe, it, expect*/

define([
    'require',
    'collections/openscrape.nodes',
    'openscrape.caustic',
    'openscrape.caustic.proxy',
    'openscrape.caustic.applet',
    'json!../test/fixtures/request.simple.json',
    'json!../test/fixtures/response.simple.json',
    'lib/json2',
    'lib/underscore',
    '../test/helpers',
    'lib/jquery'
], function (require, NodesCollection, Caustic, proxy, applet,
             simpleRequest, simpleResponse, json, _) {
    "use strict";

    var $ = require('jquery'),
        resolved = new $.Deferred().resolve(),
        rejected = new $.Deferred().reject(),
        resp = $.Deferred().resolve(json.stringify(simpleResponse));

    describe("Caustic", function () {

        var choose = function (button) {
            this.$dom.find('input[value="' + button + '"]').click();
        };

        beforeEach(function () {
            this.caustic = new Caustic(this.$dom);
            this.choose = _.bind(choose, this);
        });

        afterEach(function () {
        });

        it('should prompt the user whether to use the proxy or applet', function () {
            this.caustic.scrape(simpleRequest);
            var $prompt = this.$dom.find('.prompt');
            this.expect($prompt.text()).to.match(/proxy/i);
            this.expect($prompt.text()).to.match(/applet/i);
        });

        describe('if they choose the proxy', function () {

            beforeEach(function () {
                sinon.stub(proxy, 'request').returns(resp);
            });

            afterEach(function () {
                proxy.request.restore();
            });

            it('should dismiss the prompt', function () {
                this.caustic.scrape(simpleRequest);
                this.choose('Proxy');
                this.clock.tick(500);
                this.expect(this.$dom.html()).to.be.empty;
            });

            it('should request from the proxy', function () {
                this.caustic.scrape(simpleRequest);
                this.choose('Proxy');

                proxy.request.should.have.been.calledWith(json.stringify(simpleRequest));
                proxy.request.should.have.been.calledOnce;
            });
        });

        describe('if they choose the applet', function () {

            beforeEach(function () {
                sinon.stub(applet, 'request').returns(resp);
                sinon.stub(applet, 'enable').returns(resolved);
            });

            afterEach(function () {
                applet.request.restore();
                applet.enable.restore();
            });

            it('should dismiss the prompt', function () {
                this.caustic.scrape(simpleRequest);
                this.choose('Applet');
                this.clock.tick(500);
                this.expect(this.$dom.html()).to.be.empty;
            });

            it('should enable the applet', function () {
                this.caustic.scrape(simpleRequest);
                this.choose('Applet');
                applet.enable.should.have.been.called.once;
            });

            it('should request from the applet', function () {
                this.caustic.scrape(simpleRequest);
                this.choose('Applet');
                applet.request.should.have.been.calledWith(json.stringify(simpleRequest));
            });

            it('should warn the user and use the proxy if the applet won\'t enable', function () {
                applet.enable.returns(rejected);
                sinon.stub(proxy, 'request').returns(resp);

                this.caustic.scrape(simpleRequest);
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
