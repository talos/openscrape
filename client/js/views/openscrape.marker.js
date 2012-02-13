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
    'lib/google',
    'lib/google.rich-marker',
    'lib/underscore',
    'lib/backbone',
    '../openscrape.geocoder',
    '../openscrape.zip2borough',
    'models/openscrape.node',
    'collections/openscrape.nodes',
    'views/openscrape.visual',
    'models/openscrape.warning',
    'views/openscrape.warning',
    'lib/jquery'
], function (require, google, rich_marker, _, backbone,
             geocoder, zip2borough, NodeModel,
             NodesCollection, VisualView, WarningModel, WarningView) {
    "use strict";

    var $ = require('jquery');

    return backbone.View.extend({

        tagName: 'div',
        className: 'marker',

        /**
         * Must be called with a google map (options.gMap)
         */
        initialize: function (options) {
            var lat = this.model.get('lat'),
                lng = this.model.get('lng');

            this.visual = new VisualView({
                collection: this.model.nodes,
                el: this.$el
            });

            this.marker = new google.maps.Marker({
                map: options.gMap,
                position: new google.maps.LatLng(lat, lng),
                zIndex: 1
            });

            this.richMarker = new rich_marker.RichMarker({
                map: options.gMap, // TODO binds us to google maps!! :/
                flat: true,
                position: new google.maps.LatLng(lat, lng),
                anchor: rich_marker.RichMarkerPosition.MIDDLE,
                clickable: false,
                content: this.el,
                zIndex: 0
            });

            if (this.model.has('address')) {
                this.render();
            } else {
                this.marker.setTitle('Looking up address...');
                geocoder.reverseGeocode(lat, lng)
                    .done(_.bind(function (address) {
                        this.model.save('address', address);

                        // TODO
                        address.apt = '';
                        address.borough = zip2borough(address.zip);
                        address.Borough = address.borough;

                        if (!address.borough) {
                            new WarningView({
                                model: new WarningModel({
                                    text: "Sorry, that selection is not in the five boroughs."
                                })
                            }).render();
                            this.model.destroy();
                        } else {
                            var rootNode = this.model.nodes.create({
                                tags: address,
                                instruction: 'instructions/nyc/property.json',
                                uri: document.URL,
                                name: 'Property Info',
                                type: 'wait'
                            });
                        }
                    }, this))
                    .fail(_.bind(function (reason) {
                        new WarningView({
                            model: new WarningModel({
                                text: "Sorry, couldn't find an address for that selection."
                            })
                        }).render();
                        this.model.destroy();
                    }, this));
            }

            this.model.on('change', this.render, this);
            this.model.on('destroy', this.destroy, this);

            google.maps.event.addListener(this.marker, 'click', _.bind(this.toggle, this));
        },

        /**
         * Toggle the full visual display.
         */
        toggle: function (evt) {
            this.model.toggle();
        },

        render: function () {
            this.richMarker.draw();

            this.marker.setTitle(this.model.get('address').number + ' ' + this.model.get('address').street);

            if (this.model.isCollapsed()) {
                this.visual.collapse();
            } else {

                this.visual.render();
            }

            var scale = this.model.get('scale'),
                cssScale = 'scale(' + scale + ',' + scale + ')',
                //cssOrigin = '(50, 50)',
                properties = [
                    [ 'transform', 'transform-origin' ],
                    [ '-ms-transform', '-ms-transform-origin'], /* IE 9 */
                    [ '-webkit-transform', '-webkit-transform-origin'],/* Safari and Chrome */
                    [ '-o-transform', '-o-transform-origin'], /* Opera */
                    [ '-moz-transform', '-moz-transform-origin' ] /* Firefox */
                ];

            console.log('boo');

            this.$el.css(_.reduce(properties, function (memo, prop) {
                memo[prop[0]] = cssScale;
                //memo[prop[1]] = cssOrigin;
                return memo;
            }, {}));
        },

        destroy: function () {
            this.marker.setMap(null);
            this.richMarker.setMap(null);
        }
    });
});