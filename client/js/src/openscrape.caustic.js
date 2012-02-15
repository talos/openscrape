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

/*global define*/

define([
    'require',
    'lib/json2',
    './openscrape.caustic.proxy',
    './openscrape.caustic.applet',
    './openscrape.queue',
    'models/openscrape.prompt',
    'lib/jquery'
], function (require, json, proxy, applet, Queue, PromptModel) {
    "use strict";

    var $ = require('jquery');

    function Caustic(prompts) {
        this.queue = new Queue('caustic');
        this.started = false;
        this.prompt = new PromptModel({
            text: 'Scraping hits external servers. You can'
                + ' either proxy through my server (which is slower'
                + ' and costs me!) or you can use the applet.  If'
                + ' you use the applet, you may have to confirm'
                + ' its permissions with an annoying pop-up dialog box.',
            resolve: 'Applet',
            reject: 'Proxy'
        });

        this.prompt.on('resolved', function () {
            applet.enable().done(function () {
                this.requester = applet.request;
            }).fail(function () {
                this.requester = proxy.request;
            }).always(function () {
                this.queue.start();
            });
        });

        this.prompt.on('rejected', function () {
            this.requester = proxy.request;
            this.queue.start();
        });
    }

    /**
     * Scrape a request.
     *
     * @param {Object} request a JS object to request.
     *
     * @return {Promise} that will be resolved with the raw JS object
     * of the response when the request is done, or rejected with a
     * reason for why it failed.
     **/
    Caustic.prototype.scrape = function (request) {
        if (this.prompt.isNew()) {
            this.prompts.add(this.prompt);
        }

        var dfd = new $.Deferred(),
            requestStr = json.stringify(request);

        this.queue.queue(function (next) {
            this.requester(requestStr)
                .done(function (jsonResp) {
                    dfd.resolve(json.parse(jsonResp));
                })
                .fail(function (msg) {
                    dfd.reject(msg);
                })
                .always(function () {
                    next(); // next on the line
                });
        });

        return dfd.promise();
    };

    return Caustic;
});