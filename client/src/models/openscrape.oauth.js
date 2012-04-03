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
    'lib/underscore',
    'lib/backbone',
    'lib/jquery'
], function (require, _, backbone) {
    "use strict";

    var $ = require('jquery');

    return backbone.Model.extend({
        url: '/oauth/status',

        initialize: function () {
            this.on('change:user', _.bind(function (model, user) {
                if (user) {
                    this.trigger('login', user);
                } else {
                    this.trigger('logout', this.previous('user'));
                }
            }, this));
        },

        /**
         * Retrieve the currently logged in user, or undefined if there is
         * none.
         */
        userName: function () {
            return this.get('user');
        },

        /**
         * Determine whether a user is currently logged in.
         */
        loggedIn: function () {
            return this.has('user');
        },

        /**
         * Logout the current user.
         */
        logout: function () {
            $.get('/oauth/logout').always(_.bind(function () {
                this.view.oauth.fetch();
            }, this));
        }
    });
});
