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

/*jslint browser: true*/
/*global define*/

define([
    'lib/google',
    'lib/google.rich-marker',
    'lib/underscore'
], function (google, rich_marker, underscore) {
    "use strict";

    return (function () {

        /**
         * Create a new overlay on the specified map with the
         * specified content.  Starts out invisible, and in the center
         * of the map.
         *
         * @param {openscrape.Map} map The openscrape map to display upon.
         * @param {DOM} content Content DOM to display.
         */
        function Marker(map, content) {
            this.rMarker = new rich_marker.RichMarker({
                map: map.gMap, // TODO binds us to google maps!!
                visible: false,
                flat: true,
                position: map.getCenter(),
                anchor: rich_marker.RichMarkerPosition.MIDDLE,
                content: content
            });

            map.addZoomChangedListener(function (ratio) {
                // TODO scale content!
                //$.scale(content);
            });

            this.show = underscore.show(this, this.show);
            this.hide = underscore.hide(this, this.hide);
            this.setPosition = underscore.bind(this, this.setPosition);
        }

        Marker.prototype.show = function () {
            this.rMarker.setVisible(true);
            return this;
        };

        Marker.prototype.hide = function () {
            this.rMarker.setVisible(false);
            return this;
        };

        Marker.prototybe.isVisible = function () {
            return this.rMarker.getVisible();
        };

        Marker.prototype.setPosition = function (latlng) {
            this.rMarker.setPosition(latlng);
            return this;
        };

        return Marker;
    }());
});
