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
    'lib/underscore',
    'lib/google',
    'lib/backbone',
    'lib/requirejs.mustache',
    'text!templates/map.mustache',
    '../openscrape.geocoder',
    'views/openscrape.marker',
    'lib/jquery'
], function (require, _, google, backbone, mustache, template, geocoder,
             MarkerView) {
    "use strict";

    var $ = require('jquery');

    return backbone.View.extend({

        tagName: 'div',
        id: 'map',

        initialize: function (options) {
            var dblClickWaitTime = 500,
                dblClickWait = null;

            this.$el.html(mustache.render(template));
            this.$el.addClass('loading');

            this.gMap = new google.maps.Map(
                this.$el.find('#gMap')[0],
                {
                    center: new google.maps.LatLng(this.model.lat(),
                                                   this.model.lng()),
                    zoom: this.model.get('zoom'),
                    mapTypeControl: false,
                    streetViewControl: false,
                    mapTypeId: google.maps.MapTypeId.TERRAIN
                }
            );

            this.projectionOverlay = new google.maps.OverlayView();
            this.projectionOverlay.draw = function () {};
            this.projectionOverlay.setMap(this.gMap);

            this.$lookup = this.$el.find('#lookup');
            this.lookup = new google.maps.places.Autocomplete(
                this.$lookup[0],
                {
                    bounds: this.gMap.getBounds(),
                    types: ['geocode']
                }
            );

            this.geocoder = new google.maps.Geocoder({
                bounds: this.gMap.getBounds()
            });

            // add existing markers when map is idle
            this.collection.on('reset', function (collection) {
                collection.each(_.bind(this.drawMarker, this));
            }, this);
            this.collection.on('add', this.drawMarker, this);

            // Bind all google events to model.
            // Thanks to http://stackoverflow.com/questions/832692
            google.maps.event.addListenerOnce(this.gMap, 'idle', _.bind(function () {
                this.$el.removeClass('loading');
            }, this));

            google.maps.event.addListener(this.gMap, 'bounds_changed', _.debounce(_.bind(function () {
                var center = this.gMap.getCenter();
                this.model.save({lat: center.lat(),
                                 lng: center.lng(),
                                 zoom: this.gMap.getZoom()});
                this.lookup.setBounds(this.gMap.getBounds());

            }, this), 500));

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
                this.placeChanged();
            }, this));

            this.model.on('change', this.render, this);
        },

        render: function () {
            this.gMap.setCenter(new google.maps.LatLng(this.model.lat(),
                                                       this.model.lng()));
            this.gMap.setZoom(this.model.get('zoom'));

            return this;
        },

        placeChanged: _.debounce(function () {

            var place = this.lookup.getPlace(),
                bounds,
                sw,
                ne;
            if (place) {
                if (place.geometry) {
                    this.$lookup.blur();
                    if (place.geometry.viewport) {
                        this.gMap.panToBounds(place.geometry.viewport);
                    } else {
                        this.gotoLatLng(place.geometry.location.lat(),
                                        place.geometry.location.lng());
                    }
                } else if (place.name) {

                    bounds = this.gMap.getBounds();
                    sw = bounds.getSouthWest();
                    ne = bounds.getNorthEast();

                    this.$lookup.addClass('loading');
                    geocoder.geocode(place.name, sw.lat(), sw.lng(), ne.lat(), ne.lng())
                        .done(_.bind(function (result) {
                            this.$lookup.val(result.name);
                            this.$lookup.blur();
                            this.gotoLatLng(result.lat, result.lng);
                        }, this))
                        .fail(_.bind(function (reason) {
                            this.$lookup.val('');
                            this.model.trigger('error', reason);
                        }, this))
                        .always(_.bind(function () {
                            this.$lookup.removeClass('loading');
                        }, this));
                }
            }
        }, 1000),

        gotoLatLng: function (lat, lng) {
            this.gMap.panTo(new google.maps.LatLng(lat, lng));
            this.gMap.setZoom(17);
            this.createMarker(lat, lng);
        },

        click: function (lat, lng) {
            this.$lookup.val('');
            this.createMarker(lat, lng);
        },

        createMarker: function (lat, lng) {
            return this.collection.findByLatLng(lat, lng) ||
                this.collection.create({
                    lat: lat,
                    lng: lng
                });
        },

        drawMarker: function (marker) {
            new MarkerView({
                model: marker,
                gMap: this.gMap,
                projectionOverlay: this.projectionOverlay
            }).render();
        }
    });
});
