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
    'views/openscrape.map',
    'views/openscrape.editor',
    'views/openscrape.visual',
    'lib/backbone',
    'lib/requirejs.mustache',
    'text!templates/app.mustache'
], function (MapView, EditorView, VisualView,
             backbone, mustache, appTemplate) {
    "use strict";

    return backbone.View.extend({
        initialize: function () {
            this.$el.html(mustache.render(appTemplate, this.model.toJSON()));

            new VisualView({
                el: this.$el.find('#visual')
            }).render();

            new EditorView({
                el: this.$el.find('#editor')
            }).render();

            new MapView({
                el: this.$el.find('#map')
            }).render();

            this.$help = this.$el.find('#help').hide();
            this.model.on('change', this.render, this);
        },

        render: function () {
            if (this.model.location() === 'help') {
                this.$help.slideDown();
            } else {
                this.$help.slideUp();
            }
        }
    });
});