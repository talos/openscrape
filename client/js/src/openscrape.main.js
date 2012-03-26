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

/*jslint browser: true, nomen: true, regexp: true*/
/*globals require*/

(function () {
    "use strict";

    require([
        'require',
        'models/openscrape.warning',
        'models/openscrape.oauth',
        'models/openscrape.user',
        'collections/openscrape.markers',
        'collections/openscrape.nodes',
        'views/openscrape.warning',
        'views/openscrape.map',
        'views/openscrape.visual',
        'views/openscrape.login',
        'views/openscrape.signup',
        'views/openscrape.help',
        'views/openscrape.header',
        'views/openscrape.user',
        'views/openscrape.404',
        'lib/backbone',
        'lib/underscore',
        'lib/requirejs.mustache',
        'text!templates/app.mustache',
        './openscrape.address',
        'lib/jquery'
    ], function (require, WarningModel, OAuthModel, UserModel,
                 MarkersCollection, NodesCollection, WarningView,
                 MapView, VisualView, LoginView, SignupView, HelpView,
                 HeaderView, UserView, NotFoundView,
                 backbone, _, mustache, template, Address) {

        var $ = require('jquery'),

            oauth = new OAuthModel(),
            markers = new MarkersCollection(),
            nodes = new NodesCollection(),

            map = new MapView({ collection: markers }),
            header = new HeaderView({model: oauth}),

            slice = Array.prototype.slice,

            AppView = backbone.View.extend({
                tagName: 'div',
                id: 'app',

                events: {
                    'click a.pushState': 'navigate'
                },

                initialize: function (options) {
                    this.$el.html(mustache.render(template, options));

                    markers.on('visualize', function (address, x, y) {
                        this.show(new VisualView({
                            model: nodes.forAddress(address),
                            x: x,
                            y: y
                        }));
                    }, this);

                    header.render().$el.appendTo(this.$el);

                    oauth.on('error', this.warn, this);
                    nodes.on('error', this.warn, this);
                    markers.on('error', this.warn, this);
                },

                /**
                 * Absorb link navigation to ajaxify.
                 *
                 * @param evt {event} the absorbed click event.
                 */
                navigate: function (evt) {
                    this.trigger('navigate', $(evt.currentTarget).attr('href'));
                    evt.preventDefault();
                },

                /**
                 * Put the app in a particular state.
                 *
                 * @param state {backbone.View} The view state to move to.
                 */
                show: function (state) {

                    var dfd = new $.Deferred(),
                        args = slice.call(arguments, 1);

                    // Switch out prior state if it was different.
                    if (this.state !== state && this.state) {
                        dfd.done(_.bind(this.state.remove, this.state));
                        this.state.$el.fadeOut(100, dfd.resolve);
                    } else {
                        dfd.resolve();
                    }

                    // Switch in new state when the old one is gone.
                    // Special code for map which receives args,
                    // but everything else is boilerplate.
                    dfd.done(_.bind(function () {
                        if (state === map) {
                            this.showMap.apply(this, args);
                        } else {
                            state.$el.hide().appendTo(this.$el).fadeIn(100);
                            state.render();
                        }
                        this.state = state;
                    }, this));
                },

                showMap: function (zoom, lat, lng) {
                    // append map to page if it's detached
                    if (map.$el.parent().length === 0) {
                        map.$el.appendTo(this.$el).fadeIn();
                        map.render();
                    }
                    if (lat && lng) {
                        map.pan(lat, lng);
                    }
                    if (zoom) {
                        map.zoom(zoom);
                    }
                },

                /**
                 * Display a warning with the specified text.
                 *
                 * @param caller {backbone.Events} the event caller
                 * @param text {String} What the warning says.
                 */
                warn: function (caller, text) {
                    new WarningView({
                        model: new WarningModel({ text: text})
                    }).render().$el.appendTo(this.$el);
                }
            }),

            appView = new AppView({ el: $('#openscrape') }),

            AppRouter = backbone.Router.extend({

                initialize: function () {
                    // routes are assigned manually from an array in order to
                    // ensure their ordering and use a regular expression.
                    var routes = [
                        [/(.+)/, 'user'],
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

                    map.on('bounds_changed', function (zoom, lat, lng) {
                        // this has to be wrapped because we never delete the
                        // map, but bounds_changed happens on window resize.
                        if (map.$el.is(':visible')) {
                            this.navigate('map/' + zoom + '/' + lat + '/' + lng,
                                          { replace: true });
                        }

                    }, this);

                    // This keeps the URL up to date, but does not actually
                    // trigger a visualization.
                    markers.on('visualize', function (address) {
                        this.navigate('visualize/address/' + address.zip +
                                      '/' + address.street +
                                      '/' + address.number);
                    }, this);

                    oauth.on('change:user', function (oauth, user) {
                        this.navigate(user || '/', {trigger: true});
                    }, this);

                    appView.on('navigate', function (href) {
                        this.navigate(href, {trigger: true });
                    }, this);
                },

                /**
                 * Default to map
                 */
                index: function () {
                    appView.show(map);
                },

                user: function (name) {
                    var user = new UserModel({
                        name: name
                    });
                    user.fetch({
                        success: function () {
                            appView.show(new UserView({
                                model: user
                            }));
                        },
                        error: function () {
                            appView.show(new NotFoundView({
                                href: name
                            }));
                        }
                    });
                },

                help: function () {
                    appView.show(new HelpView());
                },

                login: function () {
                    appView.show(new LoginView({model: oauth}));
                },

                logout: function () {
                    $.get('/oauth/logout').always(_.bind(function () {
                        oauth.fetch();
                    }, this));
                },

                signup: function () {
                    appView.show(new SignupView({model: oauth}));
                },

                map: function (zoom, lat, lng) {
                    appView.show(map, Number(zoom), Number(lat), Number(lng));
                },

                visualizeAddress: function (zip, street, number) {
                    try {
                        appView.show(new VisualView({
                            model: nodes.forAddress(new Address({
                                zip: zip,
                                street: street,
                                number: number
                            }))
                        }));
                    } catch (err) {
                        console.log(err);
                        appView.warn(null, "Cannot visualize " + [number, street, zip].join(' '));
                        this.navigate('/', {trigger: true});
                    }
                }
            }),

            router = new AppRouter();

        appView.render();
        oauth.fetch();
        markers.fetch();
        nodes.fetch();

        $(document).ready(function () {
            var validState = backbone.history.start({ pushState: true });
            // Send user to index for bad path
            if (!validState) {
                router.navigate('/', {trigger: true});
            }
        });
    });
}());


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
