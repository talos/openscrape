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
    './openscrape.data',
    './openscrape.applet',
    './openscrape.ajax',
    'lib/jquery',
    'lib/json2'
], function (alert, data, applet, ajax, $, JSON) {
    "use strict";

    // PRIVATE
    var $queue = $({}), // generic queue

        /**
         * Queue a request.
         *
         * @param requester A function to make the request with.
         * @param dfd a Deferred to resolve with the response or reject
         * @param id The String ID of the request.  Used to get tags.
         * @param instruction A String instruction.
         * @param force Whether to force a load.
         * @param uri URI to resolve instruction references against.  Optional.
         * @param input Input String.  Optional.
         */
        queueRequest = function (requester, dfd, id, instruction, force, uri, input) {
            $queue.queue('caustic', function () {
                var jsonRequest = JSON.stringify({
                    "id": id,
                    "uri": uri,
                    "instruction": instruction,
                    "cookies": data.getCookies(id),
                    "tags" : data.getTags(id),
                    "input": input, // Stringify drops this key if undefined.
                    "force": String(force)
                });

                requester(jsonRequest)
                    .done(function (jsonResp) {
                        dfd.resolve(JSON.parse(jsonResp));
                    }).fail(function (msg) {
                        alert.warn("Request for " + jsonRequest + " failed: " + msg);
                        dfd.reject(msg);
                    })
                    .always(function () {
                        $queue.dequeue('caustic');
                    });

            });

            // Non-fx queues are not auto-run.
            if ($queue.queue('caustic').length === 1) {
                $queue.dequeue('caustic');
            }
        },

    // PUBLIC
    /**
     * Request <code>instruction</code>.
     *
     * @param id The String ID of the request.  Used to get tags.
     * @param instruction A String instruction.
     * @param force Whether to force a load.
     * @param uri URI to resolve instruction references against.  Optional.
     * @param input Input String.  Optional.
     *
     * @return A Promise that wil be resolved with the response as a JS
     * object when the request is done, or rejected with a reason for
     * why it failed.
     **/
        request = function (id, instruction, force, uri, input) {
            var dfd = $.Deferred();

            // Use the applet if it's available, and ajax otherwise.
            applet.enable()
                .done(function () {
                    queueRequest(applet.request, dfd, id, instruction, force, uri, input);
                }).fail(function () {
                    queueRequest(ajax.request, dfd, id, instruction, force, uri, input);
                });

            return dfd.promise();
        };

    return request;
});