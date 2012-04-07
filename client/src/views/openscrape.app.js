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
/*jslint browser: true, nomen: true*/

define([
    'require',
    'models/openscrape.warning',
    'models/openscrape.oauth',
    'collections/openscrape.caustic',
    'collections/openscrape.markers',
    'collections/openscrape.nodes',
    'views/openscrape.caustic.prompt',
    'views/openscrape.warning',
    'views/openscrape.map',
    'views/openscrape.visual',
    'views/openscrape.header',
    'lib/backbone',
    'lib/underscore',
    'lib/requirejs.mustache',
    'text!templates/app.mustache',
    'lib/jquery'
], function (require, WarningModel, OAuthModel,
             CausticCollection,
             MarkersCollection, NodesCollection, CausticPromptView, WarningView,
             MapView, VisualView, HeaderView,
             backbone, _, mustache, template) {
    "use strict";

    var $ = require('jquery'),
        slice = Array.prototype.slice;

    return backbone.View.extend({
        tagName: 'div',
        id: 'app',

        events: {
            'click a.pushState': 'navigate'
        },

        initialize: function (options) {
            this.oauth = new OAuthModel();
            this.caustic = new CausticCollection();
            this.markers = new MarkersCollection();
            this.nodes = new NodesCollection();

            this.oauth.fetch();
            this.markers.fetch();
            this.nodes.fetch();

            this.causticPrompt = new CausticPromptView({ collection: this.caustic });
            this.map = new MapView({ collection: this.markers });
            this.header = new HeaderView({model: this.oauth});

            this.$el.html(mustache.render(template, options));

            this.markers.on('visualize', function (address, x, y) {
                this.show(new VisualView({
                    model: this.nodes.forAddress(address),
                    x: x,
                    y: y
                }));
            }, this);

            this.header.render().$el.appendTo(this.$el);

            this.oauth.on('error', this.warn, this);
            this.nodes.on('error', this.warn, this);
            this.markers.on('error', this.warn, this);
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
                if (state === this.map) {
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
            if (this.map.$el.parent().length === 0) {
                this.map.$el.appendTo(this.$el).fadeIn();
                this.map.render();
            }
            if (lat && lng) {
                this.map.pan(lat, lng);
            }
            if (zoom) {
                this.map.zoom(zoom);
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
