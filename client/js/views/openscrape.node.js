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
 * A node view renders a single node information, be it a value or a response.
 */
define([
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
    'collections/openscrape.nodes'
], function (ready, match, page, wait, reference, missing, failed,
             mustache, _, backbone, caustic, nodesCollection) {
    "use strict";

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
            'click #scrape': 'scrape'
        },

        // initialize: function () {
        //     this.model.on('change', this.render, this);
        // },

        render: function () {
            this.$el.html(mustache.render(
                this.templates[this.model.type],
                this.model
            ));
            this.model.set('width', this.$el.width());
            this.model.set('height', this.$el.height());
            return this;
        },

        scrape: function () {
            
        }

        // done: function () {
        //     this.$el.removeClass('loading');
        // },

        // request: function () {
        //     this.$el.addClass('loading');
        //     this.model.fetch({
        //         success: _.bind(this.done, this),
        //         failure: _.bind(this.done, this)
        //     });
        // }
    });
});
