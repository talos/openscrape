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
        'lib/backbone',
        'lib/underscore',
        'lib/requirejs.mustache',
        'text!templates/app.mustache',
        './openscrape.address',
        './openscrape.sync',
        'lib/jquery'
    ], function (require, WarningModel, MarkersCollection,
                 NodesCollection, WarningView, MapView, VisualView,
                 backbone, _, mustache, appTemplate, Address) {

        var $ = require('jquery'),

            markers = new MarkersCollection(),
            nodes = new NodesCollection(),

            map = new MapView({
                collection: markers
            }),

            AppView = backbone.View.extend({

                events: {
                    'click .toggleHelp': 'toggleHelp'
                },

                initialize: function (options) {
                    this.$el.html(mustache.render(appTemplate, options));
                    this.$help = this.$('#help').hide();

                    map.on('visualize', this.visualizeAddress, this);

                    nodes.on('error', this.warn, this);
                    markers.on('error', this.warn, this);
                },

                showMap: function (zoom, lat, lng) {
                    this.hideVisual().done(_.bind(function () {
                        console.log('done');
                        if (lat && lng) {
                            map.pan(lat, lng);
                        }
                        if (zoom) {
                            map.zoom(zoom);
                        }
                        if (map.$el.parent().length === 0) {
                            map.$el.appendTo(this.$el).fadeIn();
                        }
                    }, this));
                },

                /**
                 * Fade the map out and pull it out of the DOM once it's faded.
                 */
                hideMap: function () {
                    map.$el.fadeOut(_.bind(map.remove, map));
                },

                /**
                 * Create a new visual view for the address, centered on x and y.
                 */
                visualizeAddress: function (address, x, y) {
                    var model = nodes.forAddress(address);

                    if (model) {
                        this.hideVisual(); // hide existing visual
                        this.hideMap();

                        this.visual = new VisualView({
                            model: model,
                            x: x || this.$el.width() / 2,
                            y: y || this.$el.height() / 2
                        });
                        this.visual.$el.appendTo(this.$el);
                        this.visual.resize();
                        this.visual.render();
                    }
                },

                /**
                 * Fade out any existing visual, and remove it from the DOM once
                 * it's faded.
                 *
                 * @return {Promise} that is resolved once the visual is gone.
                 */
                hideVisual: function () {
                    var visual = this.visual,
                        dfd = new $.Deferred();
                    if (visual) {
                        visual.$el.fadeOut(function () {
                            visual.remove();
                            dfd.resolve();
                        });
                        delete this.visual;
                    } else {
                        dfd.resolve();
                    }
                    return dfd.promise();
                },

                toggleHelp: function () {
                    if (this.$help.is(':visible')) {
                        this.$help.slideUp();
                    } else {
                        this.$help.slideDown();
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
                    'visualize/address/:zip/:street/:number': 'visualizeAddress',
                    'map*': 'map',
                    'map/:zoom/:lat/:lng': 'map'
                },

                /**
                 * Default to NYC
                 */
                index: function () {
                    appView.showMap();
                },

                map: function (zoom, lat, lng) {
                    appView.showMap(Number(zoom), Number(lat), Number(lng));
                },

                /**
                 * Visualize the specified address.
                 */
                visualizeAddress: function (zip, street, number) {
                    try {
                        appView.visualizeAddress(new Address({
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