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
    'text!../templates/response',
    'text!../templates/ready',
    'text!../templates/match',
    'text!../templates/page',
    'lib/underscore',
    'lib/json2',
    'lib/jquery'
], function (templates, underscore, json, $) {
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
            if (underscore.has(obj, key)) {
                obj[key].push.apply(obj[key], array);
            } else {
                obj[key] = array;
            }

        },

        __extends = function (child, parent) {
            var key;
            underscore.extend(child, parent);
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
         * response.  It must be subclassed to implement .render(el).
         *
         * Value.name : the name of this Value grouping
         * Value.responses : an array of Response objects.
         * Value.children : alias for Value.responses
         */
        Value = (function () {

            function Value(name, responsesAry, parentResponse) {
                this.id = underscore.uniqueId('value_');
                this.name = name;
                this.responses = underscore.map(responsesAry, function (respObj) {
                    return Response.create(respObj, parentResponse);
                });
                this.children = this.responses;
            }

            return Value;
        }()),

        /**
         * A Match is a Value resulting from a regular expression
         * match.  It is produced by Found.
         *
         * Match.render(el) : render this Match onto the DOM `el'.
         */
        Match = (function () {
            __extends(Match, Value);

            function Match() {
                this.render = underscore.bind(this.render, this);
                Match.__super__.constructor.apply(this, arguments);
            }

            Match.prototype.render = function (el) {
                $(el).append(templates.render('match', this));
            };

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
                this.render = underscore.bind(this.render, this);
                Page.__super__.constructor.apply(this, arguments);
                this.pageDataURI = 'data:text/html;charset=utf-8,' + encodeURIComponent(this.name);
            }

            Page.prototype.render = function (el) {
                $(el).append(templates.render(this));
            };

            return Page;
        }()),

        /**
         * A Response is the result of trying to execute a single instruction.
         *
         * Response.parentResponse : The parent response of this Response.  There is also a .parent attribute created by d3.
         * Response.children : An array of Value or Response objects.
                               Returns empty array by default.
                               Should be overriden by subclasses.
         * Response.render(el) : render this Response onto the DOM `el'.
         *                       Subclasses should override this method.
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
             * @param parentResponse The parent Response of this Response.  Optional.
             */
            Response.create = function (obj, parentResponse) {
                switch (obj.status) {
                case 'loaded':
                    return new Loaded(obj, parentResponse);
                case 'found':
                    return new Found(obj, parentResponse);
                case 'reference':
                    return new Reference(obj, parentResponse);
                case 'wait':
                    return new Wait(obj, parentResponse);
                case 'missing':
                    return new Missing(obj, parentResponse);
                case 'failed':
                    return new Failed(obj, parentResponse);
                default:
                    throw "Unknown Response status: " + obj.status;
                }
            };

            function Response(obj, parentResponse) {
                this.id = underscore.uniqueId('response_');
                this.responseParent = parentResponse;
                this.hasParent = typeof parentResponse !== 'undefined';

                this.children = [];

                this.getCookieJar = underscore.bind(this.getCookieJar, this);
                this.getTags = underscore.bind(this.getTags, this);
            }

            Response.prototype.getCookieJar = function (searchParent) {
                return this.hasParent && searchParent ? this.parentResponse.getCookieJar(true) : {};
            };

            Response.prototype.getTags = function (searchParent) {
                return this.hasParent && searchParent ? this.parentResponse.getTags(true) : {};
            };

            return Response;
        }()),

        /**
         * Ready responses were successes.  They have actual values,
         * names, and descriptions.  Ready subclasses must override .render and .children.
         */
        Ready = (function () {
            __extends(Ready, Response);

            function Ready(obj) {
                this.name = obj.name;
                this.description = obj.description;

                this.getCookieJar = underscore.bind(this.getCookieJar, this);
                this.getTags = underscore.bind(this.getTags, this);
                Ready.__super__.constructor.apply(this, arguments);
            }

            Ready.prototype.getCookieJar = function (searchParent) {
                var superJar = Ready.__super__.getCookieJar.call(this, searchParent);

                if (this.children.length === 1) {
                    underscore.each(this.children[0].responses, function (resp) {
                        underscore.each(resp.getCookieJar(false), function (cookies, host) {
                            accumulate(superJar, host, cookies);
                        });
                    });
                }

                return superJar;
            };

            Ready.prototype.getTags = function (searchParent) {
                var superTags = Ready.__super__.getTags.call(this, searchParent);

                if (this.children.length === 1) {
                    underscore.each(this.children[0].responses, function (resp) {
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

                this.render = underscore.bind(this.render, this);
                this.getCookieJar = underscore.bind(this.getCookieJar, this);
                this.getTags = underscore.bind(this.getTags, this);

                this.page = new Page(underscore.keys(obj.children)[0], underscore.values(obj.children)[0], this);

                Loaded.__super__.constructor.apply(this, arguments);

                this.children = [this.page];
            }

            Loaded.prototype.getCookieJar = function (searchParent) {
                var superJar = Loaded.__super__.getCookieJar.call(this, searchParent);

                underscore.each(this.cookieJar, function (host, cookies) {
                    accumulate(superJar, host, cookies);
                });

                return superJar;
            };

            Loaded.prototype.render = function (el) {
                
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
                this.render = underscore.bind(this.render, this);
                this.getTags = underscore.bind(this.getTags, this);
                this.matches = underscore.map(obj.children, function (responsesAry, name) {
                    return new Match(name, responsesAry, self);
                });
                Found.__super__.constructor.apply(this, arguments);
                this.children = this.matches;
            }

            Found.prototype.render = function (el) {
                $(el).append($('<div />').text("found"));
            };

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

            var onClick = function (evt) {
                console.log('wait clicked!');
                console.log(this);
            };

            function Wait(obj) {
                this.render = underscore.bind(this.render, this);
                this.name = obj.name;
                this.description = obj.description;

                Wait.__super__.constructor.apply(this, arguments);
            }

            Wait.prototype.render = function (el) {
                var $div = $('<div />').text("wait");
                $div.bind('click', onClick.bind(this));
                $(el).append($div);
            };

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
                this.render = underscore.bind(this.render, this);

                this.children = underscore.map(obj.references, function (ref) {
                    return Response.create(ref, this);
                });

                Reference.__super__.constructor.apply(this, arguments);
            }

            Reference.prototype.render = function (el) {
                $(el).append($('<div />').text("reference"));
            };

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
                this.render = underscore.bind(this.render, this);

                this.missing = obj.missing;

                Missing.__super__.constructor.apply(this, arguments);
            }

            Missing.prototype.render = function (el) {
                $(el).append($('<div />').text("missing"));
            };

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
                this.render = underscore.bind(this.render, this);

                this.failed = obj.failed;

                Failed.__super__.constructor.apply(this, arguments);
            }

            Failed.prototype.render = function (el) {
                $(el).append($('<div />').text("failed"));
            };

            return Failed;
        }());

    return Response.create;
});