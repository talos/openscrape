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
    'text!../templates/ready.mustache',
    'text!../templates/match.mustache',
    'text!../templates/page.mustache',
    'text!../templates/wait.mustache',
    'text!../templates/reference.mustache',
    'text!../templates/missing.mustache',
    'text!../templates/failed.mustache',
    'lib/requirejs.mustache',
    'lib/jquery'
], function (ready, match, page, wait, reference, missing, failed, mustache, $) {
    "use strict";

    return {
        match: function (context) {
            return mustache.render(match, context);
        },
        page: function (context) {
            var pageDataURI = 'data:text/html;charset=utf-8,' + encodeURIComponent(context.name);
            return mustache.render(page, context);

        },
        loaded: function (context) {

            return mustache.render(ready, context);
        },
        found: function (context) {

            return mustache.render(ready, context);
        },
        wait: function (waitResponse) {
            var $el = $(mustache.render(wait, waitResponse)),
                request = waitResponse.request;

            request.tags = waitResponse.getTags(true);
            request.cookies = waitResponse.getCookieJar(true);
            request.force = true;

            $el.bind('click', request.send);

            return $el[0];
        },
        reference: function (context) {

            return mustache.render(reference, context);
        },
        missing: function (context) {

            return mustache.render(missing, context);
        },
        failed: function (context) {

            return mustache.render(failed, context);
        }
    };
});
