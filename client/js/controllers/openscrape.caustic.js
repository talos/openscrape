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
/*global define*/

define([
    'lib/json2',
    'lib/jquery',
    'controllers/openscrape.caustic.proxy',
    'controllers/openscrape.caustic.applet'
], function (json, $, proxy, applet) {
    "use strict";

    var $queue = $({}), // generic queue
        QUEUE_NAME = 'openscrape.caustic',

        /**
         * Queue a request.
         *
         * @param {function} requester A function to make the request with.
         * @param {Deferred} dfd a Deferred to resolve with the response or reject
         * @param {Request} request the {openscrape.Request} to make.
         */
        queueRequest = function (requester, dfd, request) {
            var isFirst = $queue.queue(QUEUE_NAME).length === 0;

            $queue.queue(QUEUE_NAME, function () {
                requester(json.stringify(request))
                    .done(function (jsonResp) {
                        dfd.resolve(json.parse(jsonResp));
                    }).fail(function (msg) {
                        dfd.reject(msg);
                    })
                    .always(function () {
                        $queue.dequeue(QUEUE_NAME);
                    });
            });

            // Non-fx queues are not auto-run.
            if (isFirst) {
                $queue.dequeue(QUEUE_NAME);
            }
        };

    return {

        /**
         * Make a request.
         *
         * @param {openscrape.Request} request A request to make.
         *
         * @return {Promise} that will be resolved with the raw JS object
         * of the response when the request is done, or rejected with a
         * reason for why it failed.
         **/
        request: function (request) {
            var dfd = $.Deferred();

            // Use the applet if it's available, and proxy otherwise.
            // TODO mvc violation
            applet.enable()
                .done(function () {
                    queueRequest(applet.request, dfd, request);
                }).fail(function () {
                    queueRequest(proxy.request, dfd, request);
                });

            return dfd.promise();
        }
    };
});