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
    'lib/underscore',
    'lib/backbone',
    'collections/openscrape.nodes'
], function (_, backbone, nodes) {
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
        collection: nodes,

        defaults: {
            cookies: {},
            tags: {}
        },

        /**
         * Nodes should be flat, rather than nested.  This makes sure
         * that is the case.
         */
        initialize: function () {
            if (this.has('children')) {
                this.collection.add(this.get('children'));
                this.unset('children');
            }
        },

        /**
         * @return {Array} all the immediate {openscrape.Node}
         * children of this node.
         */
        children: function () {
            return this.collection.filter(_.bind(function (node) {
                return node.get('parentId') === this.id;
            }, this));
        },

        /**
         * @return {Array} all the ancestor {openscrape.Node}s of this
         * node.
         */
        ancestors: function () {
            var parentId = this.get('parentId'),
                parent,
                ancestors = [];

            while (typeof parentId !== 'undefined') {
                parent = this.collection.get(parentId);
                ancestors.push(parent);
                parentId = parent.get('parentId');
            }

            return ancestors;
        },

        /**
         * @return {Array} of {openscrape.Node} models that are
         * uniquely descended from this node.
         */
        uniqueDescendents: function () {
            var children = this.children(),
                child,
                descendents;

            while (children.length === 1) {
                child = this.collection.get(children[0]);
                descendents.push(child);
                children = child.children();
            }

            return descendents;
        },

        /**
         * @return {Array} of {openscrape.Node} models uniquely above
         * and below this node, including this node at the end.
         */
        related: function () {
            return Array.prototype.concat(this.ancestors(), this.descendents(), [this]);
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
                _.invoke(this.related(), 'get', 'cookies'),
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
                _.invoke(this.related(), 'get', 'tags'),
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
                _.invoke(this.ancestors(), 'get', 'width'),
                function (memo, width) { return memo + width; },
                0
            );
        }
    });
});