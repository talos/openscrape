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
    'text!../../templates/marker.mustache',
    '../openscrape.geocoder',
    'models/openscrape.map',
    'collections/openscrape.nodes',
    'views/openscrape.visual',
    'lib/jquery'
], function (require, google, rich_marker, _, backbone, mustache, template,
             geocoder, mapModel, nodesCollection, VisualView) {
    "use strict";

    var $ = require('jquery');

    return backbone.View.extend({

        tagName: 'div',
        className: 'marker',

        events: {
            'click .toggle': 'toggle'
        },

        /**
         * Must be called with a google map (options.gMap)
         */
        initialize: function (options) {
            var lat = this.model.get('lat'),
                lng = this.model.get('lng');

            //this.content = this.make('div', 'content');
            $(this.el).html(mustache.render(template), this.model);
            this.$visual = this.$el.find('.visual');

            //this.visual = new Visual(nodes.findByAddress(this.model.get('address')));
            this.marker = new rich_marker.RichMarker({
                map: options.gMap, // TODO binds us to google maps!! :/
                visible: true,
                flat: true,
                position: new google.maps.LatLng(lat, lng),
                anchor: rich_marker.RichMarkerPosition.MIDDLE,
                content: this.el
            });

            // immediately look for address
            geocoder.reverseGeocode(lat, lng)
                .done(_.bind(function (address) {
                    //this.model.save('address', address);
                    var node = nodesCollection.findByAddress(address)
                            || nodesCollection.create({ tags: address });
                    if (node) {
                        this.$visual.append(new VisualView(node).render().$el);
                    } else {
                        console.log(address);
                        this.model.destroy();
                    }
                }, this))
                .fail(_.bind(function (reason) {
                    this.model.destroy();
                }, this));

            // always keep an eye on zoom changes
            mapModel.on('change:scale', this.rescale, this);

            this.model.on('change:collapsed', this.collapse, this);
            this.model.on('destroy', this.destroy, this);
        },

        toggle: function () {
            this.model.toggle();
        },

        collapse: function () {
            if (this.model.get('collapsed') === true) {
                this.$visual.hide();
            } else {
                this.$visual.show();
            }
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
        },

        destroy: function () {
            this.marker.setMap(null);
        }
    });
});