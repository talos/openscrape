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

/*jslint nomen: true*/
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
    },
        padding = 80;

    return backbone.Model.extend({
        defaults: function () {
            return {
                childIds: [],
                cookies: {},
                tags: {},
                force: false,
                expanded: true,
                translation: 0,
                width: 0,
                height: 0
            };
        },

        initialize: function () {
            this.on('change:width change:translation', function () {
                _.each(this.descendents(), function (node) {
                    node.save('translation', node.translation());
                });
            }, this);

            // When tags or children change here, check all related models for changes
            this.on('change:tags change:childIds', function () {
                _.invoke(this.related().concat(this), 'tagsChanged');
            });
            
        },

        type: function () {
            return this.get('type');
        },

        parent: function () {
            if (!this._parent) {
                this._parent = this.collection.get(this.get('parentId'));
            }
            return this._parent;
        },

        translation: function () {
            return this.parent() ? this.parent().translation() + this.parent().width() + padding : 0;
        },

        /**
         * Check this model for changes to type resulting from new tags.
         */
        tagsChanged: function () {
            if (this.type() === 'missing') {
                console.log('missing');
                console.log(this.tags());
                console.log(this.get('missing'));
                this.save('missing',
                          _(this.get('missing')).without(_(this.tags()).keys())
                         );
            }
        },

        /**
         * Flatten all children into separate childIDs.
         */
        normalize: function () {
            var children = this.get('children'),
                childIds = this.get('childIds'),
                status;

            this.unset('children', {silent: true});
            this.save({}, {silent: true}); // ninja grab our ID

            if (this.has('status')) {
                // is a proper response, create values for children
                status = this.get('status');
                this.set('type', status, {silent: true});
                _.each(children, function (respAry, valueName) {
                    var childTags = {},
                        thisTags = this.get('tags'),
                        childNode;

                    // if (status === 'found') {
                    //     if (children.length === 1) {
                    //         // one-to-one relations store the tag here
                    //         thisTags[this.get('name')] = valueName;
                    //         this.set('tags', thisTags, {silent: true});
                    //     } else {
                    //         // otherwise, the tag is in the child.
                    //         childTags[this.get('name')] = valueName;
                    //     }
                    // }

                    childNode = this.collection.create({
                        name: valueName,
                        parentId: this.id,
                        type: status === 'loaded' ? 'page' : 'match',
                        children: respAry,
                        tags: childTags
                    });
                    childNode.normalize();
                    childIds.push(childNode.id);
                }, this);
            } else {
                // is a value, already has responses for children
                _.each(children, function (child) {
                    child.parentId = this.id;
                    delete child.id;
                    var childNode = this.collection.create(child);
                    childNode.normalize();
                    childIds.push(childNode.id);
                }, this);
            }

            if (_.include(childIds, this.id)) {
                throw "BAD Self referential child";
            }

            this.set({
                childIds: childIds,
                expanded: childIds.length === 1 // only show if one child
            });

            this.save();
            if (this.type() === 'missing') {
                console.log('missing');
                console.log(this.toJSON());
                console.log(this.tags());
                console.log(this.related());
            }
        },

        /**
         * Toggle whether this node's children are visible.
         */
        toggle: function () {
            this.save('expanded', !this.expanded());
        },

        /**
         * @return {Boolean} True if this node's children are visible,
         * False otherwise.
         */
        expanded: function () {
            return this.get('expanded');
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
         * @param excludeId a child ID to ignore when tracking down.  Optional.
         *
         * @return {Array[openscrape.NodeModel]} below this node, excluding only
         * one-to-many found relations.
         */
        oneToOneDescendents: function (excludeId) {
            var descendents = [],
                isBranch = (this.type() === 'value' && this.get('childIds').length > 1),
                children = this.collection.filterIds(_.without(this.get('childIds'), excludeId));

            if (!isBranch) {
                Array.prototype.push.apply(descendents, children);
                _.each(children, function (child) {
                    Array.prototype.push.apply(descendents, child.oneToOneDescendents(excludeId));
                });
            }
            return descendents;
        },

        /**
         * @param excludeId a child ID to ignore when tracking down.  Optional.
         *
         * @return {Array[openscrape.NodeModel]} One-to-one found relations
         * both below this node, above, and around it.
         */
        related: function (excludeId) {
            var related = this.collection.filterIds(this.oneToOneDescendents(excludeId));

            if (this.parent()) {
                Array.prototype.push.apply(related, this.parent().related(this.id));
            }

            related.push(this);
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
                function (memo, tags) { return _.extend(memo, tags); },
                {}
            );
        },

        /**
         * Get or set the rendered width of this node.
         */
        width: function (w) {
            if (w) {
                this.set('width', w);
            }
            return this.get('width');
        },

        /**
         * Get or set the rendered height of this node.
         */
        height: function (h) {
            if (h) {
                this.set('height', h);
            }
            return this.get('height');
        },

        /**
         * Return this model's attributes and its visible children's
         * attributes as a tree for d3.
         *
         * @return {Object}
         */
        asTree: function () {
            var obj = this.toJSON();
            if (this.expanded()) {
                obj.children = _.map(
                    this.children(),
                    function (child) { return child.asTree(); }
                );
            }
            return obj;
        },

        /**
         * @return {Array[openscrape.NodeModel]}
         */
        children: function () {
            return this.collection.filterIds(this.get('childIds'));
        },

        /**
         * Obtain all descendent nodes matching the filter.
         *
         * @param {Function} filter An optional filter.  Will pull all
         * descendents if not included.
         *
         * @return {Array[openscrape.NodeModel]}
         */
        descendents: function (filter) {
            return _.reduce(
                filter ? _.filter(this.children(), filter) : this.children(),
                function (memo, child) {
                    memo.push(child);
                    return memo.concat(child.descendents(filter));
                },
                []
            );
        }
    });
});
