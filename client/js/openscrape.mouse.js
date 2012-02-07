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

define([
    'require',
    'lib/underscore',
    'lib/jquery',
    'lib/jquery-rescale'
], function (require, _) {
    "use strict";

    var $ = require('lib/jquery');

    return (function () {

        var resize = function () {
            // depends on jquery-rescale
            this.$mouse.rescale(this.width,
                                this.height,
                                {x: 0, y: 0, distort: false, direction: -1});
        };

        /**
         * Initialize the Openscrape.mouse
         *
         * @param {DOM} el The element to use for the mouse.
         * @param {Number} w The maximum width of the mouse div.
         * @param {Number} h The maximum height of the mouse div.
         **/
        function Mouse(el, w, h) {

            var offsetX = 10,
                offsetY = 10;

            this.$mouse = $(el);
            this.width = w;
            this.height = h;

            //Bind global mouse move to manipulating the $mouse element.
            $("body").bind('mousemove', _.bind(function (evt) {
                if (this.$mouse.is(':visible')) {
                    this.$mouse.css({
                        "left": (evt.pageX + offsetX) + "px",
                        "top": (evt.pageY + offsetY) + "px"
                    });
                }
            }, this));
        }

        /**
         * Replace the mouse div content text.
         *
         * @param {String} text The text to put in the mouse div.
         *
         * @return {openscrape.Mouse} this
         **/
        Mouse.prototype.setText = function (text) {
            this.$mouse.empty().text(text);
            resize.call(this);
            return this;
        };

        /**
         * Show the div.
         *
         * @return {openscrape.Mouse} this
         **/
        Mouse.prototype.show = function () {
            return this.$mouse.show();
        };

        /**
         * Hide the div.
         *
         * @return {openscrape.Mouse} this
         **/
        Mouse.prototype.hide = function () {
            return this.$mouse.hide();
        };

        return Mouse;
    }());
});


    // return {


    //     /**
    //      Replace the mouse div content with some arbitrary HTML.  The
    //      DOM will be searched to ensure that it has no <title>
    //      elements hanging out.

    //      @param text The text to put in the mouse div.
    //      **/
    //     setHTML: function (html) {
    //         var $container = $('<div />').html(html);
    //         $container.find('title').remove();
    //         $container.find('script').remove();
    //         $container.find('style').remove();
    //         $container.find('link').remove();
    //         $mouse.empty().append($container);
    //         this.resize();
    //     },

//};
