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
    'require',
    'lib/json2',
    './openscrape.caustic.proxy',
    './openscrape.caustic.applet',
    'models/openscrape.prompt',
    'views/openscrape.prompt',
    'lib/jquery'
], function (require, json, proxy, applet, PromptModel, PromptView) {
    "use strict";

    var $ = require('jquery'),
        $queue = $({}), // generic queue
        QUEUE_NAME = 'openscrape.caustic',
        promptModel = new PromptModel({
            text: 'Scraping hits external servers. You can'
                + ' either proxy through my server (which is slower'
                + ' and costs me!) or you can use the applet.  If'
                + ' you use the applet, you may have to confirm'
                + ' its permissions with an annoying pop-up dialog box.',
            resolve: 'Applet',
            reject: 'Proxy'
        }),
        started = false,
        queue = function (func) {
            $queue.queue(QUEUE_NAME, func);
        },
        dequeue = function () {
            if (started === true) {
                $queue.dequeue(QUEUE_NAME);
            }
        },
        startQueue = function () {
            started = true;
            dequeue();
        },
        requester,
        promptView,

        /**
         * Queue a request.
         *
         * @param {Object} request The request to make.
         *
         * @return {Promise} Will be resolved or rejected with the result
         * of the request.
         */
        queueRequest = function (request) {
            var dfd = new $.Deferred(),
                requestStr = json.stringify(request);

            queue(function () {
                requester(requestStr)
                    .done(function (jsonResp) {
                        dfd.resolve(json.parse(jsonResp));
                    }).fail(function (msg) {
                        dfd.reject(msg);
                    })
                    .always(function () {
                        dequeue(); // next on the line
                    });
            });

            return dfd.promise();
        };

    promptModel.on('resolved', function () {
        applet.enable().done(function () {
            requester = applet.request;
        }).fail(function () {
            requester = proxy.request;
        }).always(function () {
            startQueue();
        });
    });

    promptModel.on('rejected', function () {
        requester = proxy.request;
        startQueue();
    });

    return {

        /**
         * Scrape a request.
         *
         * @param {Object} request a JS object to request.
         *
         * @return {Promise} that will be resolved with the raw JS object
         * of the response when the request is done, or rejected with a
         * reason for why it failed.
         **/
        scrape: function (request) {
            // Prompt the user if they haven't been prompted.
            if (!promptView) {
                promptView = new PromptView({model: promptModel});
            }

            return queueRequest(request);
        }
    };
});