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
    'text!../templates/response.mustache',
    'text!../templates/ready.mustache',
    'text!../templates/match.mustache',
    'text!../templates/page.mustache',
    'text!../templates/wait.mustache',
    'text!../templates/reference.mustache',
    'text!../templates/missing.mustache',
    'text!../templates/failed.mustache',
    './openscrape.request',
    'lib/underscore',
    'lib/json2',
    'lib/requirejs.mustache',
    'lib/jquery',
    'lib/jquery-rescale'
], function (response, ready, match, page, wait, reference,
             missing, failed, request, _, json, mustache, $) {
    "use strict";

    /**
     * Accumulate items in array within object under key.  If the
     * key does not exist, create it.
     *
     * @param obj The object to accumulate within.
     * @param key The String key to accumulate under.
     * @param array An array of values to accumulate.
     */
    var accumulate = function (obj, key, array) {
            if (_.has(obj, key)) {
                obj[key].push.apply(obj[key], array);
            } else {
                obj[key] = array;
            }

        },

        pad = 50,

        __extends = function (child, parent) {
            var key;
            _.extend(child, parent);
            function Ctor() {
                this.constructor = child;
            }
            Ctor.prototype = parent.prototype;
            child.prototype = new Ctor();
            child.__super__ = parent.prototype;
            //return child;
        },

        /**
         * A Value is a single grouping of children responses from a Ready
         * response.  It must be subclassed to provide an .el property.
         *
         * Value.name : the name of this Value grouping
         * Value.responses : an array of Response objects.
         * Value.children : alias for Value.responses
         */
        Value = (function () {

            function Value(name, responsesAry, parentResponse) {
                this.id = _.uniqueId('value_');
                this.name = name;
                this.responses = _.map(responsesAry, function (respObj) {
                    return Response.create(respObj, this);
                }, this);
                this.parentResponse = parentResponse;
                this.children = this.responses;
                this.distance = _.bind(this.distance, this);
            }

            /**
             * @return {Number} How far out this value runs.
             */
            Value.prototype.distance = function () {
                var $el = $(this.el),
                    width = $el.html() ? $el.width() : 0;
                return this.parentResponse.distance() + width + pad;
            };

            return Value;
        }()),

        /**
         * A Match is a Value resulting from a regular expression
         * match.  It is produced by Found.
         */
        Match = (function () {
            __extends(Match, Value);

            function Match() {
                Match.__super__.constructor.apply(this, arguments);
                this.el = mustache.render(match, this);
            }

            return Match;
        }()),

        /**
         * A Page is a Value resulting from a Loaded
         *
         * Page.render(el) : render this Page onto the DOM `el'.
         */
        Page = (function () {
            __extends(Page, Value);

            function Page() {
                Page.__super__.constructor.apply(this, arguments);
                this.pageDataURI = 'data:text/html;charset=utf-8,' + encodeURIComponent(this.name);
                this.el = mustache.render(page, this);
            }

            return Page;
        }()),

        /**
         * A Response is the result of trying to execute a single instruction.
         *
         * Response.parentResponse : The parent response of this Response.
                                      There is also a .parent attribute created by d3.
         * Response.children : An array of Value or Response objects.
                               Returns empty array by default.
                               Should be overriden by subclasses.
         * Response.getTags(searchParent) : Get the tags associated with this response and, 
         *                                  optionally, its ancestors.
         * Response.getCookieJar(searchParent) : Get The cookie jar associated with this
         *                                     response and, optionally, its ancestors.
         */
        Response = (function () {
            /**
             * Static method to construct a Response subclass from a JS object.
             *
             * @param obj A JS object.
             * @param parentValue The parent Value of this Response. Optional
             */
            Response.create = function (obj, parentValue) {
                switch (obj.status) {
                case 'loaded':
                    return new Loaded(obj, parentValue);
                case 'found':
                    return new Found(obj, parentValue);
                case 'reference':
                    return new Reference(obj, parentValue);
                case 'wait':
                    return new Wait(obj, parentValue);
                case 'missing':
                    return new Missing(obj, parentValue);
                case 'failed':
                    return new Failed(obj, parentValue);
                default:
                    throw "Unknown Response status: " + obj.status;
                }
            };

            function Response(obj, parentValue) {
                this.id = _.uniqueId('response_');
                this.parentValue = parentValue;
                //this.hasParent = typeof parentResponse !== 'undefined';
                this.instruction = obj.instruction;

                this.children = [];

                this.getCookieJar = _.bind(this.getCookieJar, this);
                this.getTags = _.bind(this.getTags, this);
                this.distance = _.bind(this.distance, this);
            }

            Response.prototype.getCookieJar = function (searchParent) {
                return this.parentValue && searchParent ? this.parentValue.parentResponse.getCookieJar(true) : {};
            };

            Response.prototype.getTags = function (searchParent) {
                return this.parentValue && searchParent ? this.parentValue.parentResponse.getTags(true) : {};
            };

            /**
             * @return {Number} How far from the origin this Response runs.
             */
            Response.prototype.distance = function () {
                var $el = $(this.el),
                    width = $el.html() ? $el.width() : 0;
                return (this.parentValue ? this.parentValue.distance() : 0) + width + pad;
            };

            // /**
            //  * @return {Array} {'name': 'value'} pairs.
            //  */
            // Response.prototype.tagsArray = function () {
            //     return _.map(this.getTags(true), function (value, name) {
            //         return {name: name, value: value};
            //     });
            // };

            // /**
            //  * @return {Array} of {Object}s of this format:
            //  *
            //  * [{'host': {String}, 'cookies': [{String}, {String}, {String}]}, ...]
            //  */
            // Response.prototype.cookiesArray = function () {
            //     return _.map(this.getCookieJar(true), function (host, cookies) {
            //         return {host: host, cookies: cookies};
            //     });
            // };

            return Response;
        }()),

        /**
         * Ready responses were successes.  They have actual values,
         * names, and descriptions.  Ready subclasses must override .children.
         */
        Ready = (function () {
            __extends(Ready, Response);

            function Ready(obj) {
                this.name = obj.name;
                this.description = obj.description;

                this.getCookieJar = _.bind(this.getCookieJar, this);
                this.getTags = _.bind(this.getTags, this);
                Ready.__super__.constructor.apply(this, arguments);

                this.el = mustache.render(ready, this);
            }

            Ready.prototype.getCookieJar = function (searchParent) {
                var superJar = Ready.__super__.getCookieJar.call(this, searchParent);

                if (this.children.length === 1) {
                    _.each(this.children[0].responses, function (resp) {
                        _.each(resp.getCookieJar(false), function (cookies, host) {
                            accumulate(superJar, host, cookies);
                        });
                    });
                }

                return superJar;
            };

            Ready.prototype.getTags = function (searchParent) {
                var superTags = Ready.__super__.getTags.call(this, searchParent);

                if (this.children.length === 1) {
                    _.each(this.children[0].responses, function (resp) {
                        superTags.extend(resp.getTags(false));
                    });
                }

                return superTags;
            };

            return Ready;
        }()),

        /**
         * Loaded responses were the results of loading a page.  They
         * always have only one Page.  They also have cookies from the Response.
         */
        Loaded = (function () {
            __extends(Loaded, Ready);

            function Loaded(obj) {
                this.cookieJar = obj.cookies;

                this.getCookieJar = _.bind(this.getCookieJar, this);
                this.getTags = _.bind(this.getTags, this);

                this.page = new Page(_.keys(obj.children)[0], _.values(obj.children)[0], this);

                Loaded.__super__.constructor.apply(this, arguments);

                this.children = [this.page];
            }

            Loaded.prototype.getCookieJar = function (searchParent) {
                var superJar = Loaded.__super__.getCookieJar.call(this, searchParent);

                _.each(this.cookieJar, function (host, cookies) {
                    accumulate(superJar, host, cookies);
                });

                return superJar;
            };

            return Loaded;
        }()),

        /**
         * Found responses were the results of looking through some
         * input.  They can have an arbitrary number of matches.
         */
        Found = (function () {
            __extends(Found, Ready);

            function Found(obj) {
                var self = this;
                this.getTags = _.bind(this.getTags, this);
                this.matches = _.map(obj.children, function (responsesAry, name) {
                    return new Match(name, responsesAry, self);
                });
                Found.__super__.constructor.apply(this, arguments);
                this.children = this.matches;
            }

            Found.prototype.getTags = function (searchParent) {
                var superTags = Found.__super__.getTags.call(this, searchParent);

                if (this.matches.length === 1) {
                    superTags[this.name] = this.matches[0].name;
                }

                return superTags;
            };

            return Found;
        }()),

        /**
         * Wait responses were the result of an instruction that
         * wanted to load a page, but wasn't forced to.  They have
         * descriptions and names.
         */
        Wait = (function () {
            __extends(Wait, Response);

            var load = function (evt) {
                request(this.instruction,
                        this.getTags(),
                        this.getCookieJar(),
                        true, '')
                    .done(_.bind(function (respObj) {
                        console.log(respObj);

                        // TODO does this correctly replace?
                        // var oldId = this.id;
                        // _.extend(this, Response.create(respObj, this.parentValue));
                        // this.id = oldId;
                        // this.render();
                        // TODO render new children?
                    }, this));
            };

            function Wait(obj) {
                this.name = obj.name;
                this.description = obj.description;

                Wait.__super__.constructor.apply(this, arguments);
                this.el = mustache.render(wait, this);
                $(this.el).find('.load').bind('click', _.bind(load, this));
            }

            return Wait;
        }()),

        /**
         * Reference responses are the result of an instruction that
         * was an array of other instructions.  Their children are
         * those responses.
         */
        Reference = (function () {
            __extends(Reference, Response);

            function Reference(obj) {
                this.children = _.map(obj.references, function (ref) {
                    return Response.create(ref, this);
                });

                Reference.__super__.constructor.apply(this, arguments);
                this.el = mustache.render(reference, this);
            }

            return Reference;
        }()),

        /**
         * Missing responses are the result of an instruction that
         * couldn't be completed because tags were missing.
         *
         * Missing.missing : an array of the missing tags.
         */
        Missing = (function () {
            __extends(Missing, Response);

            function Missing(obj) {
                this.missing = obj.missing;

                Missing.__super__.constructor.apply(this, arguments);
                this.el = mustache.render(missing, this);
            }

            return Missing;
        }()),

        /**
         * Failed responses are the result of an instruction that
         * cannot be completed due to an insoluble error.
         *
         * Failed.failed : a string explaining what went wrong.
         */
        Failed = (function () {
            __extends(Failed, Response);

            function Failed(obj) {
                this.failed = obj.failed;

                Failed.__super__.constructor.apply(this, arguments);
                this.el = mustache.render(failed, this);
            }

            return Failed;
        }());

    return Response.create;
});