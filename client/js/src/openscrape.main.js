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
        'models/openscrape.map',
        'views/openscrape.warning',
        'views/openscrape.prompt',
        'views/openscrape.map',
        'views/openscrape.editor',
        'views/openscrape.visual',
        'lib/backbone',
        'lib/underscore',
        'lib/requirejs.mustache',
        'text!templates/app.mustache',
        './openscrape.caustic',
        './openscrape.sync',
        'lib/jquery'
    ], function (require, NodesCollection, MarkersCollection,
             WarningsCollection, PromptsCollection, MapModel,
             WarningView, PromptView, MapView, EditorView, VisualView,
             backbone, _, mustache, appTemplate, Caustic) {

        var $ = require('jquery'),

            mapModel = new MapModel({
                lat: 40.77,
                lng: -73.98,
                zoom: 11
            }),
            nodes = new NodesCollection(),
            markers = new MarkersCollection(),
            warnings = new WarningsCollection(),
            prompts = new PromptsCollection(),

            AppView = backbone.View.extend({

                initialize: function (options) {

                    this.$el.html(mustache.render(appTemplate, options));

                    this.caustic = new Caustic(prompts);

                    this.prompt = new PromptView({
                        el: this.$el.find('#prompt'),
                        collection: prompts
                    });

                    this.warning = new WarningView({
                        el: this.$el.find('#warning'),
                        collection: warnings
                    });

                    this.visual = new VisualView({
                        el: this.$el.find('#visual'),
                        collection: nodes
                    });

                    this.editor = new EditorView({
                        el: this.$el.find('#editor'),
                        collection: nodes
                    });

                    this.map = new MapView({
                        el: this.$el.find('#map'),
                        model: mapModel,
                        collection: markers
                    });

                    markers.on('visualize', this.visualize, this);
                    nodes.on('scrape', this.scrape, this);

                    mapModel.on('error', this.warn, this);
                    nodes.on('error', this.warn, this);
                    markers.on('error', this.warn, this);
                },

                /**
                 * Handle caustic.
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

                /**
                 * Direct visualization from marker to node.
                 */
                visualize: function (marker, address) {
                    var node;
                    if (marker.nodeId()) {
                        node = nodes.get(marker.nodeId());
                    } else {
                        node = nodes.create({
                            instruction: 'instructions/nyc/property.json',
                            uri: document.URL,
                            name: 'Property Info',
                            type: 'wait',
                            tags: address
                        }, {
                            wait: true
                        });
                        marker.saveNodeId(node.id);
                    }

                    node.visualize();
                },

                warn: function (text) {
                    warnings.create({
                        text: text
                    });
                }
            }),

            AppRouter = backbone.Router.extend({

                initialize: function () {
                    mapModel.on('change', _.bind(function () {
                        this.navigate('map/' + mapModel.zoom() +
                                      '/' + mapModel.lat() +
                                      '/' + mapModel.lng());
                    }, this));
                    nodes.on('edit', _.bind(function (node) {
                        this.navigate('edit/' + node.id);
                    }, this));
                    markers.on('visualize', function (marker, address) {
                        this.navigate('visualize/' + marker.id);
                    });
                },

                routes: {
                    '': 'index',
                    'help': 'help',
                    'visualize/:id': 'visualize',
                    'map/:zoom/:lat/:lng': 'map',
                    'edit/:id': 'edit'
                },

                edit: function (id) {
                    nodes.get(id).edit();
                },

                help: function () {

                },

                map: function (zoom, lat, lng) {
                    mapModel.save({
                        zoom: Number(zoom),
                        lat: Number(lat),
                        lng: Number(lng)
                    });
                },

                visualize: function (id) {
                    nodes.get(id).visualize();
                }

            }),

            appView = new AppView({ el: $('#openscrape') }),
            appRouter = new AppRouter();

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