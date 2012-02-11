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
 * A node view renders a single node information, be it a value or a response.
 */
define([
    'require',
    'text!../../templates/ready.mustache',
    'text!../../templates/match.mustache',
    'text!../../templates/page.mustache',
    'text!../../templates/wait.mustache',
    'text!../../templates/reference.mustache',
    'text!../../templates/missing.mustache',
    'text!../../templates/failed.mustache',
    'lib/requirejs.mustache',
    'lib/underscore',
    'lib/backbone',
    '../openscrape.caustic',
    'lib/jquery'
], function (require, ready, match, page, wait, reference, missing, failed,
             mustache, _, backbone, caustic) {
    "use strict";

    var $ = require('jquery');

    return backbone.View.extend({

        templates: {
            match: match,
            page: page,
            loaded: ready,
            found: ready,
            wait: wait,
            reference: reference,
            missing: missing,
            failed: failed
        },

        events: {
            'click': 'click',
            'mouseenter iframe': 'iframeEnter',
            'mouseleave iframe': 'iframeLeave'
        },

        // imaginary screen dimensions for iframe rendering
        iframeWidth: 640,
        iframeHeight: 480,

        // evah-so-clevah simulation of clicks inside iframe, which
        // can't be captured because data URI is not considered
        // same-origin.
        iframeEnter: function () {
            this.inIframe = true;
            this.model.trigger('forceStopDrag'); // prevent naughty naughty things
        },

        windowBlur: function () {
            if (this.inIframe) {
                this.$el.trigger('click');
            }
        },

        iframeLeave: function () {
            this.inIframe = false;
        },

        initialize: function () {
            this.model.on('change:type', this.render, this);
            this.model.on('change:hidden', this.render, this);
            this.model.on('add', function () {
                this.collection.on('change:tags', this.newTags, this);
            }, this);
            $(window).blur(_.bind(this.windowBlur, this));
        },

        click: function (evt) {
            if (this.model.get('type') === 'wait') {
                this.scrape();
            } else if (this.model.get('childIds').length > 1) {
                this.model.toggle();
            }
            evt.stopPropagation();
        },

        loading: function () {
            this.$('div').addClass('loading');
        },

        finished: function () {
            this.$('div').removeClass('loading');
        },

        /**
         * Auto-scrape if all missing tags are found
         */
        newTags: function () {
            if (this.model.get('type') === 'missing') {
                var missingTags = this.model.get('missing'),
                    tags = this.model.tags();

                console.log(missingTags);
                console.log(tags);
                if (_.all(missingTags,
                          function (mTag) { return _.include(tags, mTag); })) {
                    this.scrape();
                }
            }
        },

        scrape: function (resp) {
            this.model.save('force', true);
            this.loading();

            caustic.scrape(this.model.asRequest())
                .done(_.bind(function (resp) {
                    // todo handle this in store?
                    delete resp.id;
                    this.model.set(resp, {silent: true});
                    this.model.normalize();
                }, this))
                .always(_.bind(function () {
                    this.finished();
                }, this));
        },

        nameIsHTML: function () {
            return (this.model.get('name') || '').trimLeft()[0] === '<';
        },

        name: function () {
            if (this.model.has('name')) {
                return this.model.get('name').substr(0, 100);
            } else {
                return 'no name';
            }
        },

        nameAsDataURI: function () {
            var asURI;
            if (this.model.has('name')) {
                asURI = encodeURIComponent(this.model.get('name'));
            } else {
                asURI = 'no name';
            }
            return 'data:text/html;charset=utf-8,' + asURI;
        },

        render: function () {
            this.$el.html(mustache.render(
                this.templates[this.model.get('type')],
                _.extend(this.model.toJSON(), this)
            ));

            if (this.model.get('hidden') === true) {
                this.$el.addClass('hidden');
            } else {
                this.$el.removeClass('hidden');
            }

            // the mustache render produces raw dimensions that must be scaled
            // down.
            var rawWidth = this.$el.width(),
                rawHeight = this.$el.height(),
                maxWidth = this.model.get('maxWidth'),
                maxHeight = this.model.get('maxHeight');

            this.model.set({
                rawWidth: rawWidth,
                rawHeight: rawHeight,
                width: rawWidth > maxWidth ? maxWidth : rawWidth,
                height: rawHeight > maxHeight ? maxHeight : rawHeight
            }, {
                silent: true
            });

            return this;
        }
    });
});
