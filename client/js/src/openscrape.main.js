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
        'collections/openscrape.nodes',
        'collections/openscrape.markers',
        'collections/openscrape.warnings',
        'collections/openscrape.prompts',
        'views/openscrape.warning',
        'views/openscrape.prompt',
        'views/openscrape.map',
        'views/openscrape.visual',
        'lib/backbone',
        'lib/underscore',
        'lib/requirejs.mustache',
        'text!templates/app.mustache',
        './openscrape.caustic',
        './openscrape.sync',
        'lib/jquery'
    ], function (require, NodesCollection, MarkersCollection,
                 WarningsCollection, PromptsCollection,
                 WarningView, PromptView, MapView, VisualView,
                 backbone, _, mustache, appTemplate, Caustic) {

        var $ = require('jquery'),

            nodes = new NodesCollection(),
            markers = new MarkersCollection(),
            warnings = new WarningsCollection(),
            prompts = new PromptsCollection(),

            map = new MapView({
                collection: markers
            }),

            visual = new VisualView({
                collection: nodes
            }),

            AppView = backbone.View.extend({

                events: {
                    'click .toggleHelp': 'toggleHelp'
                },

                initialize: function (options) {
                    this.$el.html(mustache.render(appTemplate, options));
                    this.$help = this.$('#help').hide();

                    this.caustic = new Caustic(prompts);

                    prompts.on('add', this.prompt, this);
                    warnings.on('add', this.warn, this);
                    map.on('visualize', this.visualize, this);

                    nodes.on('error', this.createWarning, this);
                    markers.on('error', this.createWarning, this);
                },

                /**
                 * Handle caustic service.
                 */
                scrape: function (node, request) {
                    this.caustic.scrape(request)
                        .done(_.bind(function (resp) {
                            // todo handle this in store?
                            delete resp.id;
                            node.set(resp, {silent: true});
                            node.normalize();
                        }, this))
                        .always(_.bind(function () {
                            node.doneScraping();
                        }, this));
                },

                showMap: function (options) {
                    options = options || {};
                    if (options.lat && options.lng) {
                        map.pan(options.lat, options.lng);
                    }
                    if (options.zoom) {
                        map.zoom(options.zoom);
                    }
                    map.$el.appendTo(this.$el);
                },

                hideMap: function () {
                    map.$el.fadeOut(_.bind(map.remove, map));
                },

                visualize: function (address, x, y) {
                    var node = nodes.findAddress(address) ||
                            nodes.create({
                                instruction: 'instructions/nyc/property.json',
                                uri: document.URL,
                                name: 'Property Info',
                                type: 'wait',
                                tags: address
                            });
                    visual.draw(node, x, y);
                    visual.$el.appendTo(this.$el);
                },

                hideVisual: function () {
                    visual.$el.fadeOut(_.bind(visual.remove, visual));
                },

                toggleHelp: function () {
                    if (this.$help.is(':visible')) {
                        this.$help.slideUp();
                    } else {
                        this.$help.slideDown();
                    }
                },

                createWarning: function (text) {
                    warnings.create({ text: text });
                },

                warn: function (warning) {
                    var view = new WarningView({ model: warning });
                    view.$el.appendTo(this.$el);
                    view.render();
                },

                prompt: function (prompt) {
                    var view = new PromptView({ model: prompt });
                    view.$el.appendTo(this.$el);
                    view.render();
                }
            }),
            appView = new AppView({ el: $('#openscrape') }),

            AppRouter = backbone.Router.extend({

                initialize: function () {
                    map.on('bounds_changed', function (zoom, lat, lng) {
                        this.navigate('map/' + zoom + '/' + lat + '/' + lng,
                                      { replace: true });
                    }, this);

                    visual.on('visualize', function (node) {
                        this.navigate('visualize/' + node.id);
                    }, this);
                },

                routes: {
                    '': 'index',
                    'visualize/:address': 'visualize',
                    'map/:zoom/:lat/:lng': 'map'
                },

                /**
                 * Default to NYC
                 */
                index: function () {
                    appView.showMap();
                },

                map: function (zoom, lat, lng) {
                    appView.showMap({zoom: Number(zoom), lat: Number(lat), lng: Number(lng)});
                },

                visualize: function (address) {
                    appView.visualize(address);
                }
            }),

            router = new AppRouter();

        nodes.fetch();
        markers.fetch();
        warnings.fetch();
        prompts.fetch();

        appView.render();
        backbone.history.start();
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