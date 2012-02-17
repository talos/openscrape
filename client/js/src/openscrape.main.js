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
        'views/openscrape.controls',
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
                 WarningView, PromptView, MapView, ControlsView,
                 EditorView, VisualView,
                 backbone, _, mustache, appTemplate, Caustic) {

        var $ = require('jquery'),

            mapModel = new MapModel(),
            nodes = new NodesCollection(),
            markers = new MarkersCollection(),
            warnings = new WarningsCollection(),
            prompts = new PromptsCollection(),

            AppView = backbone.View.extend({

                events: {
                    'click .toggleHelp': 'toggleHelp'
                },

                initialize: function (options) {

                    this.$el.html(mustache.render(appTemplate, options));
                    this.$help = this.$('#help').hide();

                    this.caustic = new Caustic(prompts);

                    this.controls = new ControlsView();

                    this.editor = new EditorView({
                        collection: nodes
                    });

                    this.map = new MapView({
                        model: mapModel,
                        collection: markers
                    });

                    this.map.$el.appendTo(this.$el);
                    this.editor.$el.appendTo(this.$el);
                    this.controls.render().$el.appendTo(this.$el);

                    this.map.render();
                    this.editor.render();

                    this.controls.on('zoom', this.zoom, this);
                    this.controls.on('pan', this.pan, this);

                    prompts.on('add', this.prompt, this);
                    warnings.on('add', this.warn, this);
                    mapModel.on('focus', this.showMap, this);
                    markers.on('visualize', this.visualizeMarker, this);
                    nodes.on('visualize', this.visualizeNode, this);
                    nodes.on('scrape', this.scrape, this);

                    mapModel.on('error', this.createWarning, this);
                    nodes.on('error', this.createWarning, this);
                    markers.on('error', this.createWarning, this);
                },

                zoom: function (inOut) {
                    if (this.visual) {
                        if (this.visual.$el.is(':visible')) {
                            this.visual.zoom(inOut);
                        }
                    }
                    if (this.map.$el.is(':visible')) {
                        mapModel.zoomInOut(inOut);
                    }
                },

                pan: function (leftRight, upDown) {
                    if (this.visual) {
                        if (this.visual.$el.is(':visible')) {
                            this.visual.pan(leftRight, upDown);
                        }
                    }
                    if (this.map.$el.is(':visible')) {
                        mapModel.pan(leftRight, upDown);
                    }
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

                showMap: function () {
                    this.map.$el.fadeIn();
                    this.hideVisual();
                },

                hideMap: function () {
                    this.map.$el.fadeOut();
                },

                /**
                 * Direct visualization from marker to node.
                 */
                visualizeMarker: function (marker, address, x, y) {
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
                        });

                        marker.saveNodeId(node.id);
                    }
                    node.visualize(x, y);
                },

                visualizeNode: function (node, x, y) {
                    this.showVisual(node, x, y);
                },

                showVisual: function (node, x, y) {
                    this.hideMap();
                    this.visual = new VisualView({
                        model: node,
                        collection: nodes,
                        x: x || this.$el.width() / 2,
                        y: y || this.$el.height() / 2
                    });
                    this.visual.$el.appendTo(this.$el);
                    this.visual.render();
                },

                hideVisual: function () {
                    if (this.visual) {
                        this.visual.remove();
                    }
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

            AppRouter = backbone.Router.extend({

                initialize: function () {
                    mapModel.on('change', function () {
                        this.navigate('map/' + mapModel.zoom() +
                                      '/' + mapModel.lat() +
                                      '/' + mapModel.lng());
                    }, this);

                    nodes.on('visualize', function (node) {
                        this.navigate('visualize/' + node.id);
                    }, this);
                },

                routes: {
                    '': 'index',
                    'visualize/:id': 'visualize',
                    'map/:zoom/:lat/:lng': 'map'
                },

                /**
                 * Default to NYC
                 */
                index: function () {
                    this.map(11, 40.77, -73.98);
                },

                map: function (zoom, lat, lng) {
                    mapModel.focus();
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