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
    'lib/underscore',
    'lib/google',
    'lib/backbone',
    'models/openscrape.map',
    'views/openscrape.marker',
    'collections/openscrape.markers'
], function (_, google, backbone, mapModel, MarkerView, MarkersCollection) {
    "use strict";

    return backbone.View.extend({
        model: mapModel,

        tagName: 'div',
        id: 'map',

        initialize: function () {
            var gMap = new google.maps.Map(this.el, {
                    center: new google.maps.LatLng(40.77, -73.98),
                    zoom: 11,
                    mapTypeControl: false,
                    streetViewControl: false,
                    mapTypeId: google.maps.MapTypeId.TERRAIN
                }),
                dblClickWaitTime = 500,
                dblClickWait = null,
                saveBounds = _.bind(function () {
                    var bounds = gMap.getBounds(),
                        center = bounds.getCenter(),
                        northEast = bounds.getNorthEast();

                    this.model.saveBounds(center.lat(), center.lng(),
                                          northEast.lat(), northEast.lng());
                }, this);

            this.markers = new MarkersCollection();
            this.$el.addClass('loading');

            // Bind all google events to model.
            // Thanks to http://stackoverflow.com/questions/832692
            google.maps.event.addListenerOnce(gMap, 'idle', _.bind(function () {
                saveBounds();
                this.model.save('loaded', true);
            }, this));
            google.maps.event.addListenerOnce(gMap, 'bounds_changed', _.bind(function () {
                saveBounds();
            }, this));
            google.maps.event.addListener(gMap, 'dblclick', function () {
                clearTimeout(dblClickWait);
            });
            google.maps.event.addListener(gMap, 'click', _.bind(function (evt) {
                var latLng = evt.latLng;

                dblClickWait = setTimeout(_.bind(function () {
                    this.model.save({
                        click: {
                            lat: latLng.lat(),
                            lng: latLng.lng()
                        }
                    });
                }, this), dblClickWaitTime);
            }, this));

            // TODO bind modification of model back to gmaps display
            this.model.on('change:loaded', this.loaded, this);
            this.model.on('change:click', this.click, this);

            this.gMap = gMap; // needed to create markers
        },

        loaded: function () {
            this.$el.removeClass('loading');
        },

        click: function () {
            if (this.markers.any(function (m) { return !m.get('collapsed'); })) {
                // a click should only collapse existing markers if any are open
                this.markers.invoke('save', 'collapsed', true);
            } else {
                // if everything is collapsed, create a new marker
                var m = new MarkerView({
                    model: this.markers.create({
                        lat: this.model.get('click').lat,
                        lng: this.model.get('click').lng
                    }),
                    gMap: this.gMap
                });
            }
        }
    });
});
