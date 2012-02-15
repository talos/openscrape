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

/*jslint nomen: true*/
/*global define*/

define([
    'lib/google',
    'lib/underscore',
    'lib/backbone'
], function (google, _, backbone) {
    "use strict";

    return backbone.View.extend({

        /**
         * Must be constructed with a google map (options.gMap) and a
         * blank overlay (google.maps.OverlayView) from which a
         * projection can be obtained.
         */
        initialize: function (options) {
            this.marker = new google.maps.Marker({
                map: options.gMap, // bound to google maps
                animation: google.maps.Animation.DROP
            });

            this.projectionOverlay = options.projectionOverlay;

            google.maps.event.addListener(this.marker, 'click', _.bind(this.click, this));
            this.model.on('change', this.render, this);
            this.model.on('destroy', this.destroy, this);
        },

        render: function () {
            var address = this.model.address();

            this.marker.setPosition(new google.maps.LatLng(this.model.lat(),
                                                           this.model.lng()));

            this.marker.setAnimation(address ? null : google.maps.Animation.BOUNCE);
            this.marker.setTitle(address ?
                                 address.number + ' ' + address.street :
                                 'Looking up address...');
        },

        click: function (evt) {
            if (this.model.address()) {
                var p = this.projectionOverlay
                        .getProjection()
                        .fromLatLngToContainerPixel(this.marker.getPosition());

                this.model.visualize(p.x, p.y);
            }
        },

        destroy: function () {
            this.marker.setMap(null);
        }
    });
});