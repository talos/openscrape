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

/*global define*/

define([
    'lib/backbone'
], function (backbone) {
    "use strict";

    return backbone.Model.extend({

        defaults: function () {
            return {
                ok: 'OK',
                dismissed: false,
                timeout: 5000
            };
        },

        initialize: function () {
            var timeout = this.get('timeout');
            if (timeout > 0) {
                setTimeout(this.dismiss, timeout);
            }
        },

        dismiss: function () {
            if (this.get('dismissed') === false) {
                this.set('dismissed', true);
                this.trigger('dismiss');
            }
        }
    });
});