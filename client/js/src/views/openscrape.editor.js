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
    'collections/openscrape.nodes',
    'text!templates/editor.mustache',
    '../openscrape.app',
    'lib/requirejs.mustache',
    'lib/backbone'
], function (nodes, editorTemplate, app, mustache, backbone) {
    "use strict";

    /**
     * An editor for the currently selected node.
     */
    return backbone.View.extend({
        render: function () {
            var editing = nodes.get(app.editing());

            if (editing) {
                this.$el.html(mustache.render(editorTemplate, editing.toJSON()));
            } else {
                this.$el.empty();
            }
        }
    });
});