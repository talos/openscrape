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
        'collections/openscrape.markers',
        'collections/openscrape.nodes',
        'views/openscrape.warning',
        'views/openscrape.map',
        'views/openscrape.visual',
        'views/openscrape.login',
        'views/openscrape.signup',
        'views/openscrape.help',
        'views/openscrape.header',
        'lib/backbone',
        'lib/underscore',
        'lib/requirejs.mustache',
        'text!templates/app.mustache',
        './openscrape.address',
        './openscrape.sync',
        'lib/jquery'
    ], function (require, WarningModel, MarkersCollection,
                 NodesCollection, WarningView, MapView, VisualView,
                 LoginView, SignupView, HelpView, HeaderView,
                 backbone, _, mustache, template, Address) {

        var $ = require('jquery'),

            markers = new MarkersCollection(),
            nodes = new NodesCollection(),

            map = new MapView({
                collection: markers
            }),

            visual = new VisualView(),
            login = new LoginView(),
            signup = new SignupView(),
            help = new HelpView(),
            header = new HeaderView(),

            slice = Array.prototype.slice,

            MAP = 1,
            VISUAL = 2,
            LOGIN = 3,
            SIGNUP = 4,
            HELP = 5,

            AppView = backbone.View.extend({
                tagName: 'div',
                id: 'app',

                initialize: function (options) {
                    this.$el.html(mustache.render(template, options));

                    map.on('visualize', function () {
                        this.show.apply(this, [VISUAL].concat(slice.call(arguments, 0)));
                    }, this);

                    header.render().$el.appendTo(this.$el);
                    visual.$el.appendTo(this.$el).hide();
                    help.$el.hide().appendTo(this.$el);
                    login.$el.hide().appendTo(this.$el);
                    signup.$el.hide().appendTo(this.$el);
                    nodes.on('error', this.warn, this);
                    markers.on('error', this.warn, this);
                },

                /**
                 * Put the app in a particular state.
                 *
                 * @param state {String} The state to move to.
                 */
                show: function (state) {

                    var dfd = new $.Deferred(),
                        args = slice.call(arguments, 1),
                        lastView;

                    // Switch out prior state if it was different.
                    if (_(this).has('state') && this.state !== state) {
                        switch (this.state) {
                        case MAP:
                            lastView = map;
                            dfd.done(_.bind(map.remove, map));
                            break;
                        case HELP:
                            lastView = help;
                            break;
                        case VISUAL:
                            lastView = visual;
                            break;
                        case LOGIN:
                            lastView = login;
                            break;
                        case SIGNUP:
                            lastView = signup;
                            break;
                        default:
                            throw "Invalid prior state: " + this.state;
                        }
                        lastView.$el.fadeOut(dfd.resolve);
                    } else {
                        dfd.resolve();
                    }

                    // Switch in new state when the old one is gone.
                    dfd.done(_.bind(function () {
                        switch (state) {
                        case MAP:
                            this.showMap.apply(this, args);
                            break;
                        case VISUAL:
                            this.showVisual.apply(this, args);
                            break;
                        case HELP:
                            help.render().$el.fadeIn();
                            break;
                        case LOGIN:
                            login.render().$el.fadeIn();
                            break;
                        case SIGNUP:
                            signup.render().$el.fadeIn();
                            break;
                        default:
                            return; // premature return to prevent setting
                                    // this.state to something weird
                        }
                        this.state = state;
                    }, this));
                },

                showMap: function (zoom, lat, lng) {
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
                 * Create a new visual view for the address, centered on x and y.
                 */
                showVisual: function (address, x, y) {
                    var model = nodes.forAddress(address);

                    if (model) {
                        visual.setModel(model);
                        visual.$el.fadeIn();
                        if (x && y) {
                            visual.center(x, y);
                        }
                        visual.resize();
                        visual.render();
                        visual.reset();
                    }
                },

                /**
                 * Display a warning with the specified text.
                 *
                 * @param {String} text What the warning says.
                 */
                warn: function (model, text) {
                    new WarningView({
                        model: new WarningModel({ text: text})
                    }).render().$el.appendTo(this.$el);
                }
            }),

            appView = new AppView({ el: $('#openscrape') }),

            AppRouter = backbone.Router.extend({

                initialize: function () {
                    map.on('bounds_changed', function (zoom, lat, lng) {
                        if (map.$el.is(':visible')) {
                            this.navigate('map/' + zoom + '/' + lat + '/' + lng,
                                          { replace: true });
                        }
                    }, this);

                    map.on('visualize', function (address) {
                        this.navigate('visualize/address/' + address.zip +
                                      '/' + address.street +
                                      '/' + address.number);
                    }, this);
                },

                routes: {
                    '': 'index',
                    'help': 'help',
                    'login': 'login',
                    'signup': 'signup',
                    'visualize/address/:zip/:street/:number': 'visualizeAddress',
                    'map*': 'map',
                    'map/:zoom/:lat/:lng': 'map'
                },

                /**
                 * Default to map
                 */
                index: function () {
                    appView.show(MAP);
                },

                help: function () {
                    appView.show(HELP);
                },

                login: function () {
                    appView.show(LOGIN);
                },

                signup: function () {
                    appView.show(SIGNUP);
                },

                map: function (zoom, lat, lng) {
                    appView.show(MAP, Number(zoom), Number(lat), Number(lng));
                },

                visualizeAddress: function (zip, street, number) {
                    try {
                        appView.show(VISUAL, new Address({
                            zip: zip,
                            street: street,
                            number: number
                        }));
                    } catch (err) {
                        appView.warn("Cannot visualize " + [number, street, zip].join(' '));
                        this.navigate('/');
                    }
                }
            }),

            router = new AppRouter();

        appView.render();

        // Send user to index for bad path
        if (!backbone.history.start({ pushState: true })) {
            router.navigate('/');
        }

        // pushState for designated links inside the appView
        appView.$el.on('click', 'a.pushState', function (evt) {
            router.navigate($(evt.currentTarget).attr('href'), {
                'trigger': true
            });
            evt.preventDefault();
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
