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

/*jslint devel: true*/
/*global jQuery*/

var openscrape;

if (!openscrape) {
    openscrape = {};
}

(function ($) {
    "use strict";

    openscrape.alert = {
        /**
         * This will display a prompt to the user with the specified text.
         *
         * @param text The text to display.
         *
         * @return A Promise that will be resolved if the user accepts, or
         * rejected if the user cancels.
         */
        prompt: function (text) {
            var dfd = new $.Deferred(),
                confirmed = confirm(text);

            if (confirmed) {
                dfd.resolve();
            } else {
                dfd.reject();
            }

            return dfd;
        },

        /**
         * Tell the user that something went wrong.
         *
         * @param warning The String warning to display.
         *
         * @return A promise that will be resolved when the user closes the warning.
         */
        warn: function (warning) {
            console.log(warning); // TODO
            return new $.Deferred().resolve();
        }
    };
}(jQuery));