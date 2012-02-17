/**
   Copyright 2012 John Krauss. All rights reserved.

   Redistribution and use in source and binary forms, with or without
   modification, are permitted provided that the following conditions
   are met:

   1. Redistributions of source code must retain the above copyright
   notice, this list of conditions and the following disclaimer.

   2. Redistributions in binary form must reproduce the above
   copyright notice, this list of conditions and the following
   disclaimer in the documentation and/or other materials provided
   with the distribution.

   THIS SOFTWARE IS PROVIDED BY JOHN KRAUSS ''AS IS'' AND ANY EXPRESS
   OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
   WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
   ARE DISCLAIMED. IN NO EVENT SHALL JOHN KRAUSS OR CONTRIBUTORS BE
   LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
   CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT
   OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR
   BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
   LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
   (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE
   USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH
   DAMAGE.

   The views and conclusions contained in the software and
   documentation are those of the authors and should not be
   interpreted as representing official policies, either expressed or
   implied, of John Krauss.
**/

/*globals define, jQuery*/

(function (factory) {
    "use strict";
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else {
        // Browser globals
        factory(jQuery);
    }
}(function ($) {
    "use strict";
    var properties = [
        [ 'transform', 'transform-origin' ],
        [ '-ms-transform', '-ms-transform-origin'], /* IE 9 */
        [ '-webkit-transform', '-webkit-transform-origin'],/* Safari and Chrome */
        [ '-o-transform', '-o-transform-origin'], /* Opera */
        [ '-moz-transform', '-moz-transform-origin' ] /* Firefox */
    ],

        len = properties.length,

        defaults = {
            w: 50,
            h: 50,
            distort: true,
            direction: 0
        },

        /**
         Construct a JS object hash that can be applied as CSS to do
         transform and transform-origin value across browsers.

         @param transform the value for the transform CSS property.
         @param transformOrigin the value for the transform-origin CSS
         property.

         @return A JS object that can be applied as CSS.
         **/
        buildCSS = function (transform, transformOrigin) {
            var memo = {},
                i; // this is so much more elegant using reduce. le sigh.
            //while (++i < len) {
            for (i = 0; i < len; i += 1) {
                memo[properties[i][0]] = transform;
                memo[properties[i][1]] = transformOrigin;
            }
            return memo;
        };

    /**
     * Scale an element to a specific width and height.
     *
     * @param w The width to scale to.  Required.
     * @param h The height to scale to.  Required.
     * @param options A JS object of options.  Can be ignored.
     * The following options are read:
     *       `x`: The x center to scale from, as a percentage from 0
     * to 100.  Defaults to 50.
     *       `y`: The y center to scale from, as a percentage from 0
     * to 100. Defaults to 50.
     *       `distort`:  Whether to allow differing x and y scale
     * factors.  Is true by default, meaning the element could be
     * distorted.  If false, the smallest of the two scales will be
     * used for both axes, so that neither w or h is ever exceeded.
     *       `direction` If negative, only scaling down will be
     * allowed.  If greater than 0, only scaling up will be allowed.
     * Otherwise, either direction is allowed.  Defaults to 0.
     *
     * @return The elements this was called upon, allowing for chaining.
     **/
    $.fn.rescale = function (w, h, options) {
        if (w === null || typeof w === 'undefined' || h === null || typeof h === 'undefined') {
            return this;
        }
        var settings = $.extend({}, defaults, options);

        return $.each(this, function (i, el) {
            var $el = $(el),
                elWidth = $el.width(),
                elHeight = $el.height(),
                xScale = w / elWidth,
                yScale = h / elHeight;

            if (settings.direction > 0) { // allow scaling only up
                xScale = xScale < 1 ? 1 : xScale;
                yScale = yScale < 1 ? 1 : yScale;
            } else if (settings.direction < 0) { // allow scaling only down
                xScale = xScale > 1 ? 1 : xScale;
                yScale = yScale > 1 ? 1 : yScale;
            }

            if (settings.distort === false) {
                if (xScale > yScale) {
                    xScale = yScale;
                } else {
                    yScale = xScale;
                }
            }

            $el.data('rescale', { // undocumented: give us away to see rescaled height & width
                width:  elWidth * xScale,
                height: elHeight * yScale
            }).css(buildCSS('scale(' + xScale + ',' + yScale + ')',
                            settings.x + '% ' + settings.y + '%'));
        });
    };
}));
