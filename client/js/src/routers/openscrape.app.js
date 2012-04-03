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
/*jslint browser: true, nomen: true, regexp: true*/

define([
    'models/openscrape.user',
    'models/openscrape.instruction',
    'views/openscrape.visual',
    'views/openscrape.login',
    'views/openscrape.signup',
    'views/openscrape.help',
    'views/openscrape.user',
    'views/openscrape.instruction',
    'views/openscrape.404',
    'lib/backbone',
    'lib/underscore',
    '../openscrape.address',
], function (UserModel, InstructionModel,
             VisualView, LoginView, SignupView, HelpView,
             UserView, InstructionView, NotFoundView,
             backbone, _, Address) {
    "use strict";

    return backbone.Router.extend({

        initialize: function (options) {
            this.view = options.view;

            // routes are assigned manually from an array in order to
            // ensure their ordering and use a regular expression.
            var routes = [
                [/([\w])+/, 'user'],
                [/([\w])+\/instruction\/([\w])+/, 'instruction'],
                [/([\w])+\/tagged\/([\w])+/, 'tagged'],
                ['', 'index'],
                ['visualize/address/:zip/:street/:number', 'visualizeAddress'],
                ['map*', 'map'],
                ['map/:zoom/:lat/:lng', 'map'],
                ['help', 'help'],
                ['login', 'login'],
                ['logout', 'logout'],
                ['signup', 'signup']
            ];

            _.each(routes, _.bind(function (route) {
                this.route(route[0], route[1]);
            }, this));

            this.view.map.on('bounds_changed', function (zoom, lat, lng) {
                // this has to be wrapped because we never delete the
                // map, but bounds_changed happens on window resize.
                if (this.view.map.$el.is(':visible')) {
                    this.navigate('map/' + zoom + '/' + lat + '/' + lng,
                                  { replace: true });
                }

            }, this);

            // This keeps the URL up to date, but does not actually
            // trigger a visualization.
            this.view.markers.on('visualize', function (address) {
                this.navigate('visualize/address/' + address.zip +
                              '/' + address.street +
                              '/' + address.number);
            }, this);

            // Navigate to user home on login.
            this.view.oauth.on('login', function (user) {
                this.navigate(user, {trigger: true});
            }, this);

            // Navigate back to index on logout.
            this.view.oauth.on('logout', function (user) {
                this.navigate('/', {trigger: true});
            }, this);

            // The view ajaxifies links and triggers events here.
            this.view.on('navigate', function (href) {
                this.navigate(href, {trigger: true });
            }, this);
        },

        /**
         * Default to map
         */
        index: function () {
            this.view.show(this.view.map);
        },

        notFound: function () {
            this.view.show(new NotFoundView({
                href: backbone.history.fragment
            }));
        },

        user: function (name) {
            var user = new UserModel({
                name: name
            });
            user.fetch({
                success: _.bind(function () {
                    this.view.show(new UserView({
                        model: user
                    }));
                }, this),
                error: _.bind(this.notFound, this)
            });
        },

        help: function () {
            this.view.show(new HelpView());
        },

        login: function () {
            this.view.show(new LoginView({model: this.view.oauth}));
        },

        logout: function () {
            this.view.oauth.logout();
        },

        signup: function () {
            this.view.show(new SignupView({model: this.view.oauth}));
        },

        map: function (zoom, lat, lng) {
            this.view.show(this.view.map, Number(zoom), Number(lat), Number(lng));
        },

        instruction: function (userName, name) {
            var instructionModel = new InstructionModel({
                user: new UserModel({name: userName}),
                name: name
            });
            instructionModel.fetch({
                success: _.bind(function () {
                    this.view.show(new InstructionView({
                        model: instructionModel
                    }));
                }, this),
                error: _.bind(this.notFound, this)
            });
        },

        visualizeAddress: function (zip, street, number) {
            try {
                this.view.show(new VisualView({
                    model: this.view.nodes.forAddress(new Address({
                        zip: zip,
                        street: street,
                        number: number
                    }))
                }));
            } catch (err) {
                console.log(err);
                this.view.warn(null, "Cannot visualize " + [number, street, zip].join(' '));
                this.navigate('/', {trigger: true});
            }
        }
    });
});

        /**
         Handle download request.

         Compresses all stylesheets into text, adds them to the SVG before hitting download.

         Won't work if browser doesn't support 'data:' scheme.
         **/
        // $(downloadSelector).click(function () {
        //     var styleText = _.reduce(document.styleSheets, function (memo, sheet) {
        //         return sheet.disabled === false ? memo + $(sheet).css2txt()[0] : memo;
        //     }, '');
        //     $('svg').attr('xmlns', "http://www.w3.org/2000/svg")
        //         .attr('xmlns:xlink', "http://www.w3.org/1999/xlink")
        //         .prepend($('<style />')
        //                  .attr('type', 'text/css')
        //                  .text('<![CDATA[  ' + styleText + '  ]]>'))
        //         .download(alert.warn);
        // });
//    });
//}());
