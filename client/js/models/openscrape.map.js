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
 * A backbone model encapsulating the important parts of map state.
 *
 * Fires 'click({lat: , lng: }' and 'zoom_change(scale)' events.
 */
define([
    'lib/google',
    'lib/underscore',
    'lib/backbone'
], function (google, _, backbone) {
    "use strict";

    return new backbone.Model.extend({
        defaults: {
            zoom: 11,
            center: {
                lat: 40.77,
                lng: -73.98
            },
            scale: 1,
            loaded: false
        },

        validate: function (attrs) {
            return _.has(attrs, 'diagonal');
        },

        initialize: function () {
            this.on('change', function () {
                if (this.hasChanged('diagonal') && this.previous('diagonal')) {
                    var ratio = this.previous('diagonal') / this.get('diagonal');

                    if (ratio > 1.1 || ratio < 0.9) {
                        this.set('scale', this.get('scale') * ratio);
                        this.trigger('zoom_change', this.get('scale'));
                    }
                }

                if (this.hasChanged('click')) {
                    this.trigger('click', { lat: this.get('clickLat'),
                                            lng: this.get('clickLng') });
                }
            }, this);
        }
    });
});