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
    'models/openscrape.app',
    'collections/openscrape.markers',
    'views/openscrape.marker',
    'lib/jquery'
], function (require, _, google, backbone, mustache, template,
             app, markers, MarkerView) {
    "use strict";

    var $ = require('jquery');

    return backbone.View.extend({

        events: {
            'keydown #lookup': 'keydownLookup',
            'blur #lookup': 'blurLookup'
        },

        initialize: function (options) {
            var dblClickWaitTime = 500,
                dblClickWait = null;

            this.$el.html(mustache.render(template));
            this.$el.addClass('loading');

            this.gMap = new google.maps.Map(
                this.$el.find('#gMap')[0],
                {
                    center: new google.maps.LatLng(app.get('lat'),
                                                   app.get('lng')),
                    zoom: app.get('zoom'),
                    mapTypeControl: false,
                    streetViewControl: false,
                    mapTypeId: google.maps.MapTypeId.TERRAIN
                }
            );

            this.lookup = new google.maps.places.Autocomplete(
                this.$el.find('#lookup')[0],
                {
                    bounds: this.gMap.getBounds(),
                    types: ['geocode']
                }
            );

            // add existing markers
            markers.each(this.addMarker);
            markers.on('add', this.addMarker, this);

            // Bind all google events to model.
            // Thanks to http://stackoverflow.com/questions/832692
            google.maps.event.addListenerOnce(this.gMap, 'idle', _.bind(function () {
                this.$el.removeClass('loading');
            }, this));

            google.maps.event.addListener(this.gMap, 'bounds_changed', _.debounce(_.bind(function () {
                var center = this.gMap.getCenter();
                app.save({lat: center.lat(),
                          lng: center.lng(),
                          zoom: this.gMap.getZoom()});
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
        },

        keydownLookup: function (evt) {
            switch (evt.keyCode) {
            case 13: // enter
                // todo determine first menu item/autocomplete
                this.placeChanged();
                break;
            case 27: // escape
                this.clearLookup();
                break;
            }
        },

        clearLookup: function (evt) {
            this.$el.find('#lookup').val('');
            this.$el.find('#lookup').blur();
        },

        blurLookup: function (evt) {
            //console.log('blur lookup');
        },

        placeChanged: _.debounce(function () {
            var place = this.lookup.getPlace();
            if (place) {
                if (place.geometry) {
                    this.clearLookup();
                    if (place.geometry.viewport) {
                        this.gMap.panToBounds(place.geometry.viewport);
                    } else {
                        this.gMap.panTo(place.geometry.location);
                        this.gMap.setZoom(11);
                        this.click(place.geometry.location.lat(), place.geometry.location.lng());
                    }
                }
            }
        }, 1000),

        click: function (lat, lng) {
            this.addMarker(markers.create({
                lat: lat,
                lng: lng
            }));
        },

        addMarker: function (marker) {
            new MarkerView({
                model: marker,
                gMap: this.gMap
            }).render();
        }
    });
});
