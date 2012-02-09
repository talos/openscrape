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
 * A node represents is a single piece of information displayed on a
 * visualization.
 */
define([
    'lib/underscore',
    'lib/backbone'
], function (_, backbone) {
    "use strict";

    /**
     * Append values from src keys into arrays of same key in dest.
     */
    var accumulate = function (memo, item) {
        _.each(item, function (value, key) {
            if (_.has(memo, key)) {
                memo[key].push.apply(memo[key], value);
            } else {
                memo[key] = value;
            }
        });
        return memo;
    };

    return backbone.Model.extend({
        defaults: {
            ancestors: [],
            childIds: [],
            cookies: {},
            tags: {},
            force: false
        },

        updateFromRaw: function (resp) {
            var children = resp.children;

            delete resp.children;
            resp.childIds = [];
            resp.type = resp.status;

            // EW
            _.each(children, function (childResp) {
                resp.childIds.push(this.collection.addRaw(resp).id);
            }, this);
            this.save(resp);
        },

        /**
         * @return The node as a request, with full-tree cookies & tags.
         */
        asRequest: function () {
            return _.extend(this.toJSON(), {
                tags: this.tags(),
                cookies: this.cookies()
            });
        },

        /**
         * @return {Array} of IDs below this node, excluding only
         * one-to-many found relations.
         */
        oneToOneDescendents: function () {
            var descendents = [];

            if (this.get('type') !== 'found' || this.get('childIds').length === 1) {
                descendents.push(this.get('childIds'));
                _.each(this.collection.getAll(this.get('childIds')), function (child) {
                    Array.prototype.push.apply(descendents, child.oneToOneDescendents());
                });
            }

            return descendents;
        },

        /**
         * @return {Array} of IDs that are one-to-one found relations
         * both below this node, above, and around it.
         */
        related: function () {
            var related = this.oneToOneDescendents();
            related.push(this.id);

            _.each(this.get('ancestors'), function (ancestor) {
                if (!_.include(related, ancestor)) {
                    related.push(ancestor);
                    Array.prototype.push.apply(related,
                                               this.collection.get(ancestor).oneToOneDescendents());
                }
            }, this);

            return related;
        },

        /**
         * Return all the cookies for the specified ID, its parents and
         * one-to-one descendents, as a cookie jar.
         *
         * @return {Object} of format:
         *
         * {host1: [cookie, cookie...], host2: [cookie, cookie]...}
         */
        cookies: function () {
            return _.reduce(
                _.invoke(this.collection.getAll(this.related()), 'get', 'cookies'),
                accumulate,
                {}
            );
        },

        /**
         * Returns all the tags for the specified ID, its parents, and
         * one-to-one descendents as a JS object.
         *
         * @return {Object} of tags.
         */
        tags: function () {
            return _.reduce(
                _.invoke(this.collection.getAll(this.related()), 'get', 'tags'),
                _.extend,
                {}
            );
        },

        /**
         * Add up all the widths to the first parent.
         *
         * @return {Number} pixels of width from first parent onwards.
         */
        distance: function () {
            return _.reduce(
                _.invoke(this.collection.getAll(this.get('ancestors')), 'get', 'width'),
                function (memo, width) { return memo + width; },
                0
            );
        }
    });
});