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
    'lib/google',
    'lib/google.rich-marker',
    'lib/underscore',
    'lib/jquery',
    'lib/jquery-rescale'
], function (google, rich_marker, _, $) {
    "use strict";

    return (function () {

        /**
         * Rescale the content.
         */
        var rescale = function () {
            var $content = $(this.content),
                scale = this.map.getScale() / 4, // make things look better close up
                cssScale = 'scale(' + scale + ',' + scale + ')',
                cssOrigin = '(50, 100)',
                properties = [
                    [ 'transform', 'transform-origin' ],
                    [ '-ms-transform', '-ms-transform-origin'], /* IE 9 */
                    [ '-webkit-transform', '-webkit-transform-origin'],/* Safari and Chrome */
                    [ '-o-transform', '-o-transform-origin'], /* Opera */
                    [ '-moz-transform', '-moz-transform-origin' ] /* Firefox */
                ];

            $content.css(_.reduce(properties, function (memo, prop) {
                memo[prop[0]] = cssScale;
                memo[prop[1]] = cssOrigin;
                return memo;
            }, {}));
        };

        /**
         * Create a new overlay on the specified map with the
         * specified content.  Starts out invisible.
         *
         * @param {openscrape.Map} map The openscrape map to display upon.
         * @param {DOM} content Content DOM to display.
         */
        function Marker(map, content) {
            this.rMarker = new rich_marker.RichMarker({
                map: map.gMap, // TODO binds us to google maps!!
                visible: false,
                flat: true,
                position: new google.maps.LatLng(0, 0),
                anchor: rich_marker.RichMarkerPosition.MIDDLE,
                content: content
            });

            map.addZoomChangedListener(_.bind(function (ratio) {
                rescale.call(this);
            }, this));

            this.map = map;
            this.content = content;
            this.show = _.bind(this.show, this);
            this.hide = _.bind(this.hide, this);
            this.setPosition = _.bind(this.setPosition, this);
        }

        Marker.prototype.show = function () {
            rescale.call(this);
            this.rMarker.setVisible(true);
            return this;
        };

        Marker.prototype.hide = function () {
            this.rMarker.setVisible(false);
            return this;
        };

        Marker.prototype.isVisible = function () {
            return this.rMarker.getVisible();
        };

        /**
         * Set the marker's position.
         *
         * @param {Number} lat The latitude as a decimal
         * @param {Number} lng THe longitude as a decimal
         */
        Marker.prototype.setPosition = function (lat, lng) {
            this.rMarker.setPosition(new google.maps.LatLng(lat, lng));
            return this;
        };

        return Marker;
    }());
});
