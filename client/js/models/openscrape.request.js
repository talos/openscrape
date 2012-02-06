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
    'lib/backbone',
    'lib/underscore'
], function (backbone, _) {
    "use strict";

    return backbone.Model.extend({
        defaults: function () {
            return {
                id: _.uniqueId('request_'),
                tags: {},
                cookies: {},
                force: false,
                uri: '',
                input: ''
            };
        },

        validate: function (attrs) {
            return _.has(attrs, 'instruction');
        }
    });
});
    // PRIVATE

    // return (function () {

    //     /**
    //      * Request <code>instruction</code>.
    //      *
    //      * @param options A JS object containing the following:
    //      * @option {String} instruction A String instruction.  Required.
    //      * @option {String} id An ID for this request.  Generated automatically.
    //      * @option {Object} tags A JS object of tags to use in the request.  Defaults to {}.
    //      * @option {Object} cookies A JS object mapping hosts to arrays of cookies.  Defaults to {}.
    //      * @option {Boolean} force Whether to force a load.  Defaults to false.
    //      * @option {String} uri URI to resolve instruction references against.  Defaults to ''.
    //      * @option {String} input Input String.  Defaults to ''.
    //      */
    //     function Request(options) {
    //         if (!_.has('instruction', options)) {
    //             throw "Must have instruction for request.";
    //         }
    //         _.defaults(options, { 'id': _.uniqueId('request_'),
    //                               'tags': {},
    //                               'cookies': {},
    //                               'force': false,
    //                               'uri': '',
    //                               'input': '' });
    //         this.json = json.stringify(options);
    //         _.extend(this, options);
    //         this.send = _.bind(this.send, this);
    //     }

    //      /**
    //       * Make the requst.
    //       *
    //       * @return A Promise that wil be resolved with the raw JS object of the response
    //       * when the request is done, or rejected with a reason for why it failed.
    //       **/
    //     Request.prototype.send = function () {
    //         var dfd = $.Deferred();

    //         // Use the applet if it's available, and ajax otherwise.
    //         applet.enable()
    //             .done(function () {
    //                 queueRequest(applet.request, dfd, this);
    //             }).fail(function () {
    //                 queueRequest(ajax.request, dfd, this);
    //             });

    //         return dfd.promise();
    //     };

    //     return Request;
    // }());
});