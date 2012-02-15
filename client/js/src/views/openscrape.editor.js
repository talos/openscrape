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
    'text!templates/editor.mustache',
    'lib/requirejs.mustache',
    'lib/backbone'
], function (editorTemplate, mustache, backbone) {
    "use strict";

    /**
     * An editor for the currently selected node.
     */
    return backbone.View.extend({

        initialize: function () {
            this.collection.on('edit', this.edit, this);
        },

        edit: function (model) {
            this.editModel = model;
            this.render();
        },

        render: function () {
            if (this.editModel) {
                this.$el.html(mustache.render(editorTemplate, this.editModel.toJSON()));
            } else {
                this.$el.empty();
            }
        }
    });
});