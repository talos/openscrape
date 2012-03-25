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

/*jslint browser: true, nomen: true*/
/*globals require*/

(function () {
    "use strict";

    require([
        'require',
        'models/openscrape.warning',
        'models/openscrape.oauth',
        'collections/openscrape.users',
        'collections/openscrape.markers',
        'collections/openscrape.nodes',
        'views/openscrape.warning',
        'views/openscrape.map',
        'views/openscrape.visual',
        'views/openscrape.login',
        'views/openscrape.signup',
        'views/openscrape.help',
        'views/openscrape.header',
        'views/openscrape.home',
        'lib/backbone',
        'lib/underscore',
        'lib/requirejs.mustache',
        'text!templates/app.mustache',
        './openscrape.address',
        'lib/jquery'
    ], function (require, WarningModel, OAuthModel,
                 UsersCollection, MarkersCollection,
                 NodesCollection, WarningView, MapView, VisualView,
                 LoginView, SignupView, HelpView, HeaderView,
                 HomeView, backbone, _, mustache, template, Address) {

        var $ = require('jquery'),

            oauth = new OAuthModel(),
            users = new UsersCollection(),
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
                    users.on('error', this.warn, this);
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
                        // visual.resize();
                        // visual.render();
                        // visual.reset();
                        if (state === map) {
                            this.showMap.apply(this, args);
                        } else {
                            state.render().$el.hide().appendTo(this.$el).fadeIn(100);
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
                    map.on('bounds_changed', function (zoom, lat, lng) {
                        //if (map.$el.is(':visible')) {
                        //}
                        this.navigate('map/' + zoom + '/' + lat + '/' + lng,
                                      { replace: true });

                    }, this);

                    markers.on('visualize', function (address) {
                        this.navigate('visualize/address/' + address.zip +
                                      '/' + address.street +
                                      '/' + address.number);
                    }, this);

                    oauth.on('change:user', function (user) {
                        this.navigate(user ? 'home' : '/', {'trigger': true});
                    }, this);

                    appView.on('navigate', function (href) {
                        this.navigate(href, {'trigger': true });
                    }, this);
                },

                routes: {
                    '': 'index',
                    'help': 'help',
                    'login': 'login',
                    'logout': 'logout',
                    'signup': 'signup',
                    'visualize/address/:zip/:street/:number': 'visualizeAddress',
                    'map*': 'map',
                    'map/:zoom/:lat/:lng': 'map',
                    '.+': 'catchAll'
                },

                /**
                 * Default to map
                 */
                index: function () {
                    appView.show(map);
                },

                help: function () {
                    appView.show(new HelpView());
                },

                catchAll: function () {
                    //  appView.show(new HomeView({
                    //      'model': users.get(oauth
                    //  }));
                    console.log(arguments);
                },

                login: function () {
                    appView.show(new LoginView({'model': oauth}));
                },

                logout: function () {
                    $.get('/oauth/logout').done(_.bind(function () {
                        oauth.fetch();
                    }, this));
                },

                signup: function () {
                    appView.show(new SignupView({'model': oauth}));
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
                        appView.warn(null, "Cannot visualize " + [number, street, zip].join(' '));
                        this.navigate('/', {'trigger': true});
                    }
                }
            }),

            router = new AppRouter();

        appView.render();
        oauth.fetch();
        markers.fetch();
        nodes.fetch();

        // Send user to index for bad path
        if (!backbone.history.start({ pushState: true })) {
            router.navigate('/', {'trigger': true});
        }
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
