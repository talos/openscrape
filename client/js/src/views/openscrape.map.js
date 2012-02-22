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
    'views/openscrape.controls',
    'models/openscrape.warning',
    'views/openscrape.warning',
    'lib/jquery'
], function (require, _, google, backbone, mustache, template, geocoder,
             MarkerView, ControlsView, WarningModel, WarningView) {
    "use strict";

    var $ = require('jquery');

    return backbone.View.extend({

        tagName: 'div',
        id: 'map',

        defaultLat: 40.77,
        defaultLng: -73.98,
        defaultZoom: 11,

        events: {
            'click #erase': 'eraseMarkers'
        },

        initialize: function (options) {
            var dblClickWaitTime = 500,
                dblClickWait = null,
                controls = new ControlsView();

            this.$el.html(mustache.render(template));
            this.$el.addClass('loading');
            controls.$el.appendTo(this.$el);
            controls.render();

            this.gMap = new google.maps.Map(
                this.$el.find('#gMap')[0],
                {
                    zoom: this.defaultZoom,
                    center: new google.maps.LatLng(this.defaultLat, this.defaultLng),
                    disableDefaultUI: true,
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

            this.collection.each(_.bind(this.drawMarker, this));
            this.collection.on('reset', function () {
                this.collection.each(_.bind(this.drawMarker, this));
            }, this);
            this.collection.on('add', this.drawMarker, this);

            // Bind all google events to model.
            // Thanks to http://stackoverflow.com/questions/832692
            google.maps.event.addListenerOnce(this.gMap, 'idle', _.bind(function () {
                this.$el.removeClass('loading');
            }, this));

            google.maps.event.addListener(this.gMap, 'bounds_changed', _.debounce(_.bind(function () {
                var center = this.gMap.getCenter();
                this.trigger('bounds_changed', this.gMap.getZoom(), center.lat(), center.lng());
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

            controls.on('pan', function (leftRight, upDown) {
                var x = this.$el.width() / 4,
                    y = this.$el.height() / 4;
                this.gMap.panBy(leftRight === 0 ? 0 : leftRight > 0 ? x : -x,
                                upDown    === 0 ? 0 : upDown    > 0 ? y : -y);
            }, this);

            controls.on('reset', this.reset, this);
            controls.on('zoom', function (inOut) {
                this.gMap.setZoom(this.gMap.getZoom() + (inOut > 0 ? 1 : -1));
            }, this);
        },

        warn: function (text) {
            new WarningView({
                model: new WarningModel({text: text})
            }).render().$el.appendTo(this.$el);
        },

        placeChanged: _.debounce(function () {
            var place = this.lookup.getPlace(),
                bounds = this.gMap.getBounds(),
                sw = bounds.getSouthWest(),
                ne = bounds.getNorthEast();
            if (place) {
                if (place.geometry) {
                    this.$lookup.blur();
                    if (place.geometry.viewport) {
                        this.gMap.panToBounds(place.geometry.viewport);
                    } else {
                        this.jumpTo(place.geometry.location.lat(),
                                    place.geometry.location.lng());
                    }
                } else if (place.name) {
                    this.$lookup.addClass('loading');
                    geocoder.geocode(place.name, sw.lat(), sw.lng(), ne.lat(), ne.lng())
                        .done(_.bind(function (name, lat, lng) {
                            this.$lookup.val(name);
                            this.$lookup.blur();
                            this.jumpTo(lat, lng);
                        }, this))
                        .fail(_.bind(function (reason) {
                            this.$lookup.val('');
                            this.warn(reason);
                        }, this))
                        .always(_.bind(function () {
                            this.$lookup.removeClass('loading');
                        }, this));
                }
            }
        }, 1000),

        jumpTo: function (lat, lng) {
            this.pan(lat, lng);
            //this.zoom(17);
            this.createMarker(lat, lng);
        },

        click: function (lat, lng) {
            this.$lookup.val('');
            this.createMarker(lat, lng);
        },

        createMarker: function (lat, lng) {
            var loadingMarker = new google.maps.Marker({
                map: this.gMap,
                position: new google.maps.LatLng(lat, lng),
                animation: google.maps.Animation.BOUNCE,
                title: 'Looking up address...'
            });
            geocoder.reverseGeocode(lat, lng)
                .done(_.bind(function (address) {
                    this.collection.create({
                        address: address,
                        lat: lat,
                        lng: lng
                    });
                }, this))
                .fail(_.bind(function (reason) {
                    this.warn(reason);
                }, this))
                .always(function () {
                    loadingMarker.setMap(null);
                });
        },

        /**
         * Bubble an event up.
         */
        // bubble: function () {
        //     backbone.Events.trigger.apply(this, arguments);
        // },

        drawMarker: function (marker) {
            var markerView = new MarkerView({
                model: marker,
                gMap: this.gMap,
                projectionOverlay: this.projectionOverlay
            }).render();
            // bubble event up
            markerView.on('all', backbone.Events.trigger, this);
        },

        remove: function () {
            $('.pac-container').remove();
            backbone.View.prototype.remove.call(this);
        },

        zoom: function (zoom) {
            this.gMap.setZoom(zoom);
        },

        pan: function (lat, lng) {
            this.gMap.panTo(new google.maps.LatLng(lat, lng));
        },

        reset: function () {
            this.pan(this.defaultLat, this.defaultLng);
            this.zoom(this.defaultZoom);
        },

        eraseMarkers: function () {
            // why does this need to be in a loop?
            while (this.collection.length) {
                this.collection.invoke('destroy');
            }
        }
    });
});
