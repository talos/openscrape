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
    'lib/requirejs.mustache',
    'text!../../templates/geocoding.mustache',
    '../openscrape.geocoder',
    'models/openscrape.map'
], function (require, google, rich_marker, d3, _, backbone, mustache, geocoding,
             geocoder, map) {
    "use strict";

    return backbone.View.extend({

        /**
         * Must be called with a google map (options.gMap)
         */
        initialize: function (options) {

            this.content = this.make('div', 'content');
            this.el = new rich_marker.RichMarker({
                map: options.gMap, // TODO binds us to google maps!!
                visible: false,
                flat: true,
                position: new google.maps.LatLng(this.model.get('lat', this.model.get('lng'))),
                anchor: rich_marker.RichMarkerPosition.MIDDLE,
                content: this.content
            });

            map.on('zoom_change', this.rescale, this);
            map.on('click', this.mapClick, this);
        },

        hide: function () {
            this.marker.setVisible(false);
        },

        show: function () {
            this.marker.setVisible(true);
        },

        isVisible: function () {
            return this.marker.getVisible();
        },

        /**
         * Try to create a new node with the address.  If it works,
         * then set it to root node.
         */
        createNode: function (address) {
            this.move(address.lat, address.lng);
            this.collection.create({
                // TODO
                instruction: window.location.origin +
                    window.location.pathname
                    + "instructions/nyc/property.json",
                tags: {
                    Number: address.number,
                    Street: address.street,
                    Borough: 3 // TODO
                }
            }, {
                success: _.bind(function (model, resp) {
                    this.setRootNode(model);
                }, this)
            });
        },

        /**
         */
        render: function () {
            this.marker.setPosition(
                new google.maps.LatLng(this.model.get('lat'), this.model.get('lng'))
            );
        },

        /**
         * Rescale the content.
         */
        rescale: function (scale) {
            var cssScale = 'scale(' + scale + ',' + scale + ')',
                cssOrigin = '(50, 100)',
                properties = [
                    [ 'transform', 'transform-origin' ],
                    [ '-ms-transform', '-ms-transform-origin'], /* IE 9 */
                    [ '-webkit-transform', '-webkit-transform-origin'],/* Safari and Chrome */
                    [ '-o-transform', '-o-transform-origin'], /* Opera */
                    [ '-moz-transform', '-moz-transform-origin' ] /* Firefox */
                ];

            this.$el.css(_.reduce(properties, function (memo, prop) {
                memo[prop[0]] = cssScale;
                memo[prop[1]] = cssOrigin;
                return memo;
            }, {}));
        }

    });
});