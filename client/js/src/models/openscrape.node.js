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
                ancestors: [], // root is first, immediate parent last
                childIds: [],
                cookies: {},
                tags: {},
                force: false,
                hidden: false,
                selected: false,
                scraping: false,
                width: 0,
                height: 0,
                rawWidth: 0,
                rawHeight: 0
            };
        },

        initialize: function () {
            this.normalize();
            //this.collection.on('change:tags', this.checkTags, this);
            //this.collection.on('normalized', this.checkTags, this); // nts: add is unsafe
        },

        scrape: function () {
            this.set('scraping', true);
            this.trigger('scrape', this, this.asRequest());
        },

        doneScraping: function () {
            this.set('scraping', false);
        },

        scraping: function () {
            return this.get('scraping');
        },

        //checkTags: function () {
            // console.log('checkTags');
            // if (this.get('type') === 'missing') {
            //     var missingTags = this.get('missing'),
            //         tagNames = _.keys(this.tags());

            //     console.log(missingTags);
            //     console.log(tagNames);
            //     console.log(_.all(missingTags,
            //               function (mTag) {
            //                   console.log(tagNames);
            //                   console.log(mTag);
            //                   console.log( _.include(tagNames, mTag));
            //                   return _.include(tagNames, mTag); }));
            //     if (_.all(missingTags,
            //               function (mTag) {
            //                   console.log(tagNames);
            //                   console.log(mTag);
            //                   console.log( _.include(tagNames, mTag));
            //                   return _.include(tagNames, mTag); })) {
            //         console.log('newTags');
            //         this.trigger('newTags');
            //     }
            // }
        //},

        /**
         * Flatten all children into separate childIDs.
         */
        normalize: function () {
            this.save({}, {silent: true}); // ninja grab our ID

            var children = this.get('children'),
                childIds = this.get('childIds'),
                childAncestors = this.get('ancestors').concat([this.id]),
                status;

            this.unset('children', {silent: true});

            if (this.has('status')) {
                // is a proper response, create values for children
                status = this.get('status');
                this.set('type', status, {silent: true});
                _.each(children, function (respAry, valueName) {
                    var childTags = {},
                        thisTags = this.get('tags');

                    if (status === 'found') {
                        if (children.length === 1) {
                            // one-to-one relations store the tag here
                            thisTags[this.get('name')] = valueName;
                            this.set('tags', thisTags, {silent: true});
                        } else {
                            // otherwise, the tag is in the child.
                            childTags[this.get('name')] = valueName;
                        }
                    }

                    childIds.push(this.collection.create({
                        name: valueName,
                        ancestors: childAncestors,
                        type: status === 'loaded' ? 'page' : 'match',
                        children: respAry,
                        tags: childTags
                    }).id);
                }, this);
            } else {
                // is a value, already has responses for children
                _.each(children, function (child) {
                    child.ancestors = childAncestors;
                    delete child.id;
                    childIds.push(this.collection.create(child).id);
                }, this);
            }

            if (_.include(childIds, this.id)) {
                throw "BAD Self referential child";
            }

            this.set({
                childIds: childIds,
                hidden: childIds.length > 1 // auto-hide if childIds greater than 1
            });

            this.save();

            this.trigger('normalized');
        },

        show: function () {
            this.save('hidden', false);
        },

        hide: function () {
            this.save('hidden', true);
        },

        toggle: function () {
            this.save('hidden', !this.get('hidden'));
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
         * @return {Array} of IDs below this node, excluding only
         * one-to-many found relations.
         */
        oneToOneDescendents: function (excludeId) {
            var descendents = [],
                isBranch = (this.get('type') === 'found' && this.get('childIds').length > 1),
                childIds = _.without(this.get('childIds'), excludeId);

            if (!isBranch) {
                Array.prototype.push.apply(descendents, childIds);
                _.each(this.collection.getAll(childIds), function (child) {
                    Array.prototype.push.apply(descendents, child.oneToOneDescendents(excludeId));
                });
            }
            return descendents;
        },

        /**
         * @return {Array} of {openscrape.NodeModel} ancestors of this node.
         */
        ancestors: function () {
            return this.collection.getAll(this.get('ancestors'));
        },

        /**
         * @return {Array<Number>} Immediate visible children IDs of this node.
         */
        visibleChildIds: function () {
            return this.get('hidden') ? [] : this.get('childIds');
        },

        /**
         * @return {Array} of IDs that are one-to-one found relations
         * both below this node, above, and around it.
         */
        related: function () {
            var related = this.oneToOneDescendents();

            _.each(this.get('ancestors'), function (ancestor) {
                if (!_.include(related, ancestor)) {
                    related.push(ancestor);
                    Array.prototype.push.apply(related,
                                               this.collection.get(ancestor).oneToOneDescendents(this.id));
                }
            }, this);

            related.push(this.id);
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
                function (memo, tags) { return _.extend(memo, tags); },
                {}
            );
        },

        /**
         * Adds up the width of this node's ancestors.
         *
         * @return {Number}
         */
        translation: function () {
            return _.reduce(
                _.invoke(this.collection.getAll(this.get('ancestors')), 'width'),
                function (memo, width) { return memo + width + padding; },
                0
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
        }
    });
});