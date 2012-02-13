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
 * A marker is a single point on the map.  It should have a lng/lat.
 */
define([
    'lib/underscore',
    'lib/backbone',
    'collections/openscrape.nodes'
], function (_, backbone, NodesCollection) {
    "use strict";

    return backbone.Model.extend({

        defaults: function () {
            return {
                scale: 1
            };
        },

        initialize: function () {
            // create nodes collection once we have an ID
            this.on('add', function () {
                this.nodes = new NodesCollection([], { id: this.id });

                // watch for nodenaughtiness
                this.nodes.on('forceStopDrag', function () {
                    this.trigger('forceStopDrag');
                }, this);
            }, this);

            this.on('destroy', function () {
                this.nodes.reset();
            }, this);
        },

        rescale: function (scale) {
            this.save('scale', scale);
        },

        expand: function () {
            this.collection.collapseAll();
            this.unset('collapsed');
            this.save();
        },

        collapse: function () {
            this.save('collapsed', true);
        },

        isCollapsed: function () {
            return this.has('collapsed');
        },

        toggle: function () {
            if (this.isCollapsed()) {
                this.expand();
            } else {
                this.collapse();
            }
        }
    });
});