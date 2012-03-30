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
    '../test/helpers',
    'lib/jquery'
], function (require, NodesCollection, Caustic, proxy, applet,
             simpleRequest, simpleResponse, json) {
    "use strict";

    var $ = require('jquery');

    describe("Caustic", function () {

        beforeEach(function () {
            var resp = $.Deferred().resolve(json.stringify(simpleResponse));

            this.proxyRequest = sinon.stub(proxy, 'request');
            this.proxyRequest.returns(resp);

            this.appletEnable = sinon.stub(applet, 'enable');
            this.appletRequest = sinon.stub(applet, 'request');
            this.appletRequest.returns(resp);

            this.caustic = new Caustic(this.$dom);
        });

        afterEach(function () {
            this.proxyRequest.restore();
            this.appletEnable.restore();
            this.appletRequest.restore();
        });

        it('should prompt the user whether to use the proxy or applet', function () {
            this.caustic.scrape(simpleRequest);
            var $prompt = this.$dom.find('.prompt');
            this.expect($prompt.text()).to.match(/proxy/i);
            this.expect($prompt.text()).to.match(/applet/i);
        });

        it('should dismiss the prompt if they choose the proxy', function () {
            this.caustic.scrape(simpleRequest);
            this.$dom.find('input[value="Proxy"]').click();

            this.clock.tick(500);
            this.expect(this.$dom.html()).to.be.empty;
        });

        it('should request from the proxy if the user chooses the proxy', function () {
            this.caustic.scrape(simpleRequest);
            this.$dom.find('input[value="Proxy"]').click();

            this.proxyRequest.should.have.been.calledWith(json.stringify(simpleRequest));
            this.proxyRequest.should.have.been.calledOnce;
        });

        it('should enable the applet if the user chooses the applet', function () {

            this.caustic.scrape(simpleRequest);
            this.appletEnable.returns($.Deferred().resolve());
            this.$dom.find('input[value="Applet"]').click();

            this.appletEnable.should.have.been.calledOnce;
        });

        it('should request from the applet if the user chooses the applet', function () {
            this.caustic.scrape(simpleRequest);
            this.appletEnable.returns($.Deferred().resolve());
            this.$dom.find('input[value="Applet"]').click();

            this.appletRequest.should.have.been.calledWith(json.stringify(simpleRequest));
            this.appletRequest.should.have.been.calledOnce;
        });
    });
});
