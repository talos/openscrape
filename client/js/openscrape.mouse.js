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

/*global jQuery*/

var openscrape;

if (!openscrape) {
    openscrape = {}; // Define openscrape if not yet defined
}

(function ($) {
    "use strict";

    var $mouse = $(),
        offsetX = 10,
        offsetY = 10,
        maxWidth = 0,
        maxHeight = 0;

    openscrape.mouse = {

        /**
           Initialize the singleton openscrape.mouse .  Can only be called once.

           @param el The element to use for the mouse.
           @param w The maximum width of the mouse div.
           @param h The maximum height of the mouse div.
        **/
        init: function (el, w, h) {
            if ($mouse.length > 0) { return; }

            $mouse = $(el);
            maxWidth = w;
            maxHeight = h;

            /**
               Bind global mouse move to manipulating the $mouse element.
            **/
            $("body").bind('mousemove', function (evt) {
                if ($mouse.is(':visible')) {
                    $mouse.css({
                        "left": (evt.pageX + offsetX) + "px",
                        "top": (evt.pageY + offsetY) + "px"
                    });
                }
            });
        },

        resize: function () {
            // depends on jquery-rescale
            $mouse.rescale(maxWidth, maxHeight, false, -1);
        },

        /**
           Replace the mouse div content text.

           @param text The text to put in the mouse div.
        **/
        setText: function (text) {
            $mouse.empty().text(text);
            this.resize();
        },

        /**
           Replace the mouse div content with some arbitrary HTML.  The
           DOM will be searched to ensure that it has no <title>
           elements hanging out.

           @param text The text to put in the mouse div.
        **/
        setHTML: function (html) {
            var $container = $('<div />').html(html);
            $container.find('title').remove();
            $container.find('script').remove();
            $container.find('style').remove();
            $mouse.empty().append($container);
            this.resize();
        },

        /**
           Show the div.
        **/
        show: function () {
            $mouse.show();
        },

        /**
           Hide the div.
        **/
        hide: function () {
            $mouse.hide();
        }
    };
}(jQuery));