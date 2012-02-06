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
    'lib/backbone',
    'controllers/caustic'
], function (ready, match, page, wait, reference, missing, failed,
             mustache, backbone, caustic) {
    "use strict";

    return backbone.View.extend({
        tagName: 'div',

        className: 'node',

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
            this.model.bind('change', this.render, this);
        },

        render: function () {
            this.$el.html(mustache.render(
                this.templates[this.model.type],
                this.model
            ));
        },

        request: function () {
            this.$el.addClass('loading');
            caustic.request(this.model.request)
                .done(this.model.bind(function (response) {
                    this.model.save({response: response});
                }, this))
                .always(this.model.bind(function () {
                    this.$el.removeClass('loading');
                }), this);
        }
    });
});
    // var pad = 50;

    // return (function () {

    //     function Node(type, context, parent, childType, children) {
    //         this.id = _.uniqueId('node_');
    //         this.context = context;
    //         this.parent = parent;
    //         this.children = _.map(children, function (child) {
    //             return new Node(childType, child, this
    //         }, this);
    //         this.el = $(render[type](context));
    //         this.distance = _.bind(this.distance, this);
    //     }

    //     /**
    //      * @return {Number} How far from the origin this Node runs.
    //      */
    //     Node.prototype.distance = function () {
    //         var width = this.el.html() ? this.el.width() : 0;
    //         return (this.parent ? this.parentValue.distance() : 0) + width + pad;
    //     };

    //     return Node;
    // }());
//});
