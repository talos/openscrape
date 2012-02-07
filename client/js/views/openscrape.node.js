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
    'text!../templates/ready.mustache',
    'text!../templates/match.mustache',
    'text!../templates/page.mustache',
    'text!../templates/wait.mustache',
    'text!../templates/reference.mustache',
    'text!../templates/missing.mustache',
    'text!../templates/failed.mustache',
    'lib/requirejs.mustache',
    'lib/underscore',
    'lib/backbone',
    './openscrape.caustic',
    'collections/openscrape.node'
], function (ready, match, page, wait, reference, missing, failed,
             mustache, _, backbone, caustic, nodes) {
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
            'click #request': 'request'
        },

        initialize: function () {
            this.model.on('change', this.render, this);
        },

        render: function () {
            this.$el.html(mustache.render(
                this.templates[this.model.type],
                this.model
            ));
            this.model.set('width', this.$el.width());
        },

        done: function () {
            this.$el.removeClass('loading');
        },

        request: function () {
            this.$el.addClass('loading');
            this.model.fetch({
                success: _.bind(this.done, this),
                failure: _.bind(this.done, this)
            });
            // caustic
            //     .request({
            //         uri: this.model.get('uri'),
            //         input: this.model.get('input'),
            //         instruction: this.model.get('instruction'),
            //         tags: nodes.tags(this.model.id),
            //         cookies: nodes.cookies(this.model.id),
            //         force: true
            //     })

            // // The raw response has to be dissected to commit it to collection.
            //     .done(this.model.bind(function (response) {
            //         while (this.has(response, 'children') {

            //         }
            //         this.model.save({response: response});
            //     }, this))
            //     .always(this.model.bind(function () {
            //         this.$el.removeClass('loading');
            //     }), this);
        }
    });
});
