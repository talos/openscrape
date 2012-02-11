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
    'views/openscrape.marker',
    'collections/openscrape.markers'
], function (_, google, backbone, MarkerView, MarkersCollection) {
    "use strict";

    return backbone.View.extend({

        tagName: 'div',
        id: 'map',

        initialize: function () {
            this.gMap = new google.maps.Map(this.el, {
                center: new google.maps.LatLng(this.model.get('lat'),
                                               this.model.get('lng')),
                zoom: 11,
                mapTypeControl: false,
                streetViewControl: false,
                mapTypeId: google.maps.MapTypeId.TERRAIN
            });

            var dblClickWaitTime = 500,
                dblClickWait = null,
                lookupElem = this.make('input', {type: 'text', id: 'lookup'}),
                saveBounds = _.bind(function () {
                    var bounds = this.gMap.getBounds(),
                        center = bounds.getCenter(),
                        northEast = bounds.getNorthEast();
                    this.model.saveBounds(center.lat(), center.lng(),
                                          northEast.lat(), northEast.lng());
                    this.lookup.setBounds(bounds);
                }, this);

            this.solidOverlay = new google.maps.Rectangle({
                map: this.gMap,
                bounds: new google.maps.LatLngBounds(
                    new google.maps.LatLng(30, -100),
                    new google.maps.LatLng(50, -50)
                ),
                visible: false,
                fillColor: 'white',
                fillOpacity: 1,
                clickable: false
            });

            this.$el.append(lookupElem);
            this.lookup = new google.maps.places.Autocomplete(
                lookupElem,
                {
                    bounds: this.gMap.getBounds(),
                    types: ['geocode']
                }
            );

            this.markers = new MarkersCollection();
            this.$el.addClass('loading');

            // Bind all google events to model.
            // Thanks to http://stackoverflow.com/questions/832692
            google.maps.event.addListenerOnce(this.gMap, 'idle', _.bind(function () {
                saveBounds();
                this.loaded();
            }, this));
            google.maps.event.addListener(this.gMap, 'bounds_changed', _.bind(function () {
                saveBounds();
            }, this));
            google.maps.event.addListener(this.gMap, 'dblclick', function () {
                clearTimeout(dblClickWait);
            });
            google.maps.event.addListener(this.gMap, 'click', _.bind(function (evt) {
                var latLng = evt.latLng;

                dblClickWait = setTimeout(_.bind(function () {
                    this.click(latLng.lat(), latLng.lng());
                }, this), dblClickWaitTime);
            }, this));

            google.maps.event.addListener(this.lookup, 'place_changed', _.bind(function () {
                this.markers.collapseAll();
                var place = this.lookup.getPlace();
                if (place.geometry) {
                    if (place.geometry.viewport) {
                        this.gMap.fitBounds(place.geometry.viewport);
                    } else {
                        this.gMap.setCenter(place.geometry.location);
                        this.gMap.setZoom(17);  // Why 17? Because it looks good. <== hehe
                        this.click(place.geometry.location.lat(), place.geometry.location.lng());
                    }
                }
            }, this));

            // TODO bind modification of model back to gmaps display
            this.markers.on('forceStopDrag', function () {
                google.maps.event.trigger(this.gMap, 'dragend');
            }, this);

            this.model.on('change:scale', function (model, scale) {
                this.markers.rescale(scale);
            }, this);

            this.model.on('change:hidden', this.toggle, this);
        },

        loaded: function () {
            this.$el.removeClass('loading');
        },

        toggle: function () {
            if (this.model.get('hidden') === true) {
                this.solidOverlay.setVisible(true);
            } else {
                this.solidOverlay.setVisible(false);
            }
        },

        click: function (lat, lng) {
            if (this.markers.allCollapsed()) {
                // if everything is collapsed, create a new marker
                var m = new MarkerView({
                    model: this.markers.create({
                        lat: lat,
                        lng: lng,
                        scale: this.model.get('scale')
                    }, {
                        wait: true
                    }),
                    gMap: this.gMap
                    //mapModel: this.model
                });
            } else {
                // a click should only collapse existing markers if any are open
                this.markers.collapseAll();
            }
        }
    });
});
