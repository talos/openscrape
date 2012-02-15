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
/*global define*/

define([
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
    'lib/requirejs.mustache',
    'text!templates/app.mustache',
    'lib/jquery'
], function (require, NodesCollection, MarkersCollection,
             WarningsCollection, PromptsCollection, mapModel,
             WarningView, PromptView, MapView, EditorView, VisualView,
             backbone, mustache, appTemplate) {
    "use strict";

    var $ = require('jquery'),
        $el = $('#openscrape').html(mustache.render(appTemplate, {
            version: '0.0.3'
        })),

        nodes = new NodesCollection(),
        markers = new MarkersCollection(),
        warnings = new WarningsCollection(),
        prompts = new PromptsCollection(),
        $help = $el.find('#help').hide(),

        router = new (backbone.Router.extend({

            routes: {
                '': 'index',
                'help': 'help',
                'visualize/:id': 'visualize',
                'map/:zoom/:lat/:lng': 'map',
                'edit/:id': 'edit'
            },

            edit: function (id) {
                nodes.edit(id);
            },

            help: function () {
                $help.slideDown();
            },

            map: function (zoom, lat, lng) {
                mapModel.save({
                    zoom: zoom,
                    lat: lat,
                    lng: lng
                });
            },

            visualize: function (id) {
                nodes.visualize(id);
            }

        }))(),

        prompt = new PromptView({
            el: $el.find('#prompt'),
            collection: prompts
        }).render(),

        warning = new WarningView({
            el: $el.find('#warning'),
            collection: warnings
        }).render(),

        visual = new VisualView({
            el: $el.find('#visual'),
            collection: nodes
        }).render(),

        editor = new EditorView({
            el: $el.find('#editor'),
            collection: nodes
        }).render(),

        map = new MapView({
            el: $el.find('#map'),
            model: mapModel,
            collection: markers
        }).render();

    nodes.fetch();
    markers.fetch();
    warnings.fetch();
    prompts.fetch();

    backbone.history.start();

    return router;
});