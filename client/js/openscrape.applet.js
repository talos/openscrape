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

/*global jQuery*/

var openscrape;

if (!openscrape) {
    openscrape = {};
}

(function ($) {
    'use strict';

    // PRIVATE
    var applet,
        pollFrequency = 200, // how often to poll the applet when requesting
        javaClass = 'com.openscrape.applet.OpenScrapeApplet.class',
        dir = 'jar/',
        jar = 'OpenScrapeApplet.jar',

        /**
         Poll all errors from the applet.

         @return An array of error strings.
         **/
        getErrors = function () {
            var errors = [],
                err;

            while ((err = applet.pollError()) !== null) {
                // cap at 10 error strings
                if (errors.length > 10) {
                    return errors;
                } else {
                    errors.push(err);
                }
            }
            return errors;
        };

    openscrape.applet = {

        /**dd
           Try to enable the applet.

           @return False if the applet is not enabled, True otherwise.
        **/
        enable: function () {
            applet = $('<applet>').attr({
                archive : jar,
                codebase : dir,
                code : javaClass,
                width : '0px',
                height : '0px',
                mayscript : 'mayscript'
            }).appendTo('body');
            return true;
        },

        /**
           Request <code>jsonRequest</code>.

           @param jsonRequest A request serialized as JSON.

           @return A Promise that will be resolved with the raw JSON response when
           the request is done, or rejected with a reason for why it failed.
        **/
        request: function (jsonRequest) {
            var dfd = $.Deferred(),
                interval;

            if (applet === null || typeof applet === 'undefined') {
                dfd.reject("There is no applet available for requests.  Use ajax instead.");
            } else if (applet.request(jsonRequest)) {

                // poll the applet for a response
                interval = setInterval(function () {
                    var resp = applet.poll(),
                        err = getErrors();
                    if (err.length > 0) {
                        clearInterval(interval);
                        dfd.reject("Applet failed on request: " + JSON.stringify(err));
                    } else if (resp !== null && typeof resp !== 'undefined') {
                        clearInterval(interval);
                        dfd.resolve(resp);
                    }
                }, pollFrequency);
            } else {
                dfd.reject("Applet rejected request: " + JSON.stringify(getErrors()));
            }

            return dfd.promise();
        }
    };
}(jQuery));