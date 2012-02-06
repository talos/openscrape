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

    // /**
    //  * Accumulate items in array within object under key.  If the
    //  * key does not exist, create it.
    //  *
    //  * @param obj The object to accumulate within.
    //  * @param key The String key to accumulate under.
    //  * @param array An array of values to accumulate.
    //  */
    // var accumulate = function (obj, key, array) {
    //         if (_.has(obj, key)) {
    //             obj[key].push.apply(obj[key], array);
    //         } else {
    //             obj[key] = array;
    //         }
    //     };

    /**
     * A Response is the result of trying to execute a single instruction.
     *
     */
    return backbone.Model.extend({
        
    });
});
    // return (function () {

    //     function Response(request, obj, parent) {
    //         //_.extend(this, obj);

    //         this.request = request;
    //         this.parent = parent;
    //         this.status = obj.status;
    //         this._cookies = _.extend({}, request.cookies, obj.cookies);

    //         if (obj.children.length === 1) {
    //             var name = obj.children.keys()[0],
    //                 responseObjects = obj.children.values()[0];
    //             this.value = new Value(name, _.map(responseObjects, function (respObj) {
    //                 return new Response(request, respObj, this);
    //             }, this));
    //         }

    //         this.getCookieJar = _.bind(this.getCookieJar, this);
    //         this.getTags = _.bind(this.getTags, this);
    //         this.distance = _.bind(this.distance, this);
    //     }

    //     Response.prototype.getCookieJar = function (searchParent) {
    //         // check ancestors
    //         var jar = this.parent && searchParent ? this.parent.getCookieJar(true) : {};

    //         // check descendents
    //         if (!this.value) {
    //             _.each(this.values[0].responses, function (resp) {

    //                 // breaking open the cookie jar
    //                 _.each(resp.getCookieJar(false), function (cookies, host) {
    //                     accumulate(jar, host, cookies);
    //                 });
    //             });
    //         }

    //         // ch'check yoself
    //         _.each(this._cookies, function (host, cookies) {
    //             accumulate(jar, host, cookies);
    //         });

    //         return jar;
    //     };

    //     Response.prototype.getTags = function (searchParent) {
    //         var tags = this.parent && searchParent ? this.parent.getTags(true) : {};

    //         if (this.value) {
    //             _.each(this.value.responses, function (resp) {
    //                 _.extend(tags, resp.getTags(false));
    //             });

    //             if (this.status === 'found') {
    //                 tags[this.name] = this.value.name;
    //             }
    //         }

    //         return tags;
    //     };

    //     return Response;
    // }());
//});