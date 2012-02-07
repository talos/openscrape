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

/**
 * This view renders the map.  It also instantiates the Visual view.
 */
define([
    'openscrape.geocoder',
    'lib/underscore',
    'lib/google',
    'lib/backbone',
    'models/openscrape.map',
    'views/openscrape.visual'
], function (geocoder, _, google, backbone, map, Visual) {
    "use strict";

    return backbone.View.extend({
        tagName: 'div',
        className: 'map',
        dblClickWaitTime: 500,
        dblClickWait: null,
        model: map,

        initialize: function () {
            var center = new google.maps.LatLng(this.model.get('lat'),
                                                this.model.get('lng'));

            this.gMap = new google.maps.Map(this.el, {
                center: center,
                zoom: this.model.get('zoom'),
                mapTypeControl: false,
                streetViewControl: false,
                mapTypeId: google.maps.MapTypeId.TERRAIN
            });

            // construct visual view using raw google map
            this.visual = new Visual({gMap: this.gMap});

            // Thanks to http://stackoverflow.com/questions/832692
            google.maps.event.addListenerOnce(this.gMap, 'idle', _.bind(this.update, this));
            google.maps.event.addListenerOnce(this.gMap, 'bounds_changed', _.bind(this.update, this));
            google.maps.event.addListener(this.gMap, 'dblclick', function () {
                clearTimeout(this.dblClickWait);
            });
            google.maps.event.addListener(this.gMap, 'click', _.bind(function (evt) {
                var latLng = evt.latLng;

                this.dblClickWait = setTimeout(_.bind(function () {
                    this.click(latLng.lat(), latLng.lng());
                }, this), this.dblClickWaitTime);
            }, this));

            // TODO bind modification of model back to gmaps display
        },

        click: function (latitude, longitude) {
            this.model.save({
                click: {
                    lat: latitude,
                    lng: longitude
                }
            });
        },

        update: function () {
            var bounds = this.gMap.getBounds(),
                center = bounds.getCenter(),
                northEast = bounds.getNorthEast();

            this.model.save({
                loaded: true,
                center : {
                    lat: center.lat(),
                    lng: center.lng()
                },
                diagonal: Math.sqrt(Math.pow(center.lng() - northEast.lng(), 2) +
                                    Math.pow(center.lat() - northEast.lat(), 2))
            });
        }
    });
});
