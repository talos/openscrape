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
    'lib/jquery'
], function (require, json, Queue) {
    "use strict";

    var $ = require('jquery');

    function Caustic() {
        this.queue = new Queue('caustic');
        this.started = false;
    }

    Caustic.prototype.start = function (requester) {
        this.requester = requester;
        this.queue.start();
        this.started = true;
    };

    Caustic.prototype.started = function () {
        return this.started;
    };

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

    // prompt.on('resolved', function () {
    //     applet.enable().done(function () {
    //         requester = applet.request;
    //     }).fail(function () {
    //         requester = proxy.request;
    //     }).always(function () {
    //         queue.start();
    //     });
    // });

    // prompt.on('rejected', function () {
    //     requester = proxy.request;
    //     queue.start();
    // });
});