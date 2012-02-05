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
    './openscrape.alert',
    './openscrape.applet',
    './openscrape.ajax',
    'lib/jquery',
    'lib/json2',
    'lib/underscore'
], function (alert, applet, ajax, $, json, underscore) {
    "use strict";

    // PRIVATE
    var $queue = $({}), // generic queue
        QUEUE_NAME = 'openscrape.request',

        /**
         * Queue a request.
         *
         * @param requester A function to make the request with.
         * @param dfd a Deferred to resolve with the response or reject
         * @param instruction A String instruction.
         * @param tags A JS object of tags.
         * @param cookies An array of cookies to use.
         * @param force Whether to force a load.
         * @param uri URI to resolve instruction references against.  Optional.
         * @param input Input String.  Optional.
         */
        queueRequest = function (requester, dfd, instruction, tags, cookies, force, uri, input) {
            var isFirst = $queue.queue(QUEUE_NAME).length === 0;

            $queue.queue(QUEUE_NAME, function () {
                var jsonRequest = json.stringify({
                    id: underscore.uniqueId('request_'),
                    uri: uri,
                    instruction: instruction,
                    tags : tags,
                    cookies: cookies,
                    input: input, // Stringify drops this key if undefined.
                    force: String(force)
                });

                requester(jsonRequest)
                    .done(function (jsonResp) {
                        dfd.resolve(json.parse(jsonResp));
                    }).fail(function (msg) {
                        alert.warn("Request for " + jsonRequest + " failed: " + msg);
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
        },

    // PUBLIC
    /**
     * Request <code>instruction</code>.
     *
     * @param instruction A String instruction.
     * @param tags A JS object of tags to use in the request.
     * @param cookies A JS object mapping hosts to arrays of cookies.
     * @param force Whether to force a load.
     * @param uri URI to resolve instruction references against.  Optional.
     * @param input Input String.  Optional.
     *
     * @return A Promise that wil be resolved with the raw JS object of the response
     * when the request is done, or rejected with a reason for why it failed.
     **/
        request = function (instruction, tags, cookies, force, uri, input) {
            var dfd = $.Deferred();

            // Use the applet if it's available, and ajax otherwise.
            applet.enable()
                .done(function () {
                    queueRequest(applet.request, dfd, instruction, tags, cookies, force, uri, input);
                }).fail(function () {
                    queueRequest(ajax.request, dfd, instruction, tags, cookies, force, uri, input);
                });

            return dfd.promise();
        };

    return request;
});