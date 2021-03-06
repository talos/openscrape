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

/*globals define*/

define(['require', 'lib/jquery'], function (require) {
    "use strict";

    // PRIVATE
    var request_path = "/request", //Path to hit caustic backend.
        $ = require('jquery');

    $.ajaxSetup({ timeout: 10000 });

    // PUBLIC
    return {
        /**
         * Request <code>jsonRequest</code>.
         *
         * @param {String} jsonRequest A request serialized as JSON.
         *
         * @return {Promise} that will be resolved with the raw JSON response
         * when the request is done, or rejected with a reason for why it
         * failed.
         **/
        request: function (jsonRequest) {
            var dfd = $.Deferred();

            $.ajax({
                url: request_path,
                type: 'POST',
                contentType: 'application/json',
                dataType: 'json',
                data: jsonRequest
            }).done(function (resp, status, doc) {
                dfd.resolve(doc.responseText);
            }).fail(function (resp) {
                dfd.reject(resp.statusText);
            });

            return dfd.promise();
        }
    };
});