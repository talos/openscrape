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

define(['lib/jquery'], function ($) {
    "use strict";

    var $container,
        defaultTimeout,
        settings = {
            timeout: 0,
            resolve: 'Yes',
            reject: 'No',
            ok: 'OK'
        },
        QUEUE_NAME = 'openscrape.alert',
        duration = 200,

        show = function ($dom) {
            var isFirst = $container.queue(QUEUE_NAME).length === 0;

            $container.queue(QUEUE_NAME, function () {
                $container.empty().append($dom).slideDown(duration);
            });

            // Non-fx queues are not auto-run.
            if (isFirst) {
                $container.dequeue(QUEUE_NAME);
            }
        },

        hide = function () {
            $container.slideUp(
                duration,
                function () {
                    $container.empty();
                    $container.dequeue(QUEUE_NAME);
                }
            );
        };

    return {

        /**
         * Initialize the alert box.
         *
         * @param $elem The jQuery elem in which to place the alert box.
         * This will pop up from the top of the screen when necessary.
         * @param options A JS object of default options:
         *                timeout: How many milliseconds to wait before closing.
         *                resolve: default text for 'resolve'
         *                reject: default text for 'reject'
         *                ok: default text for 'ok'
         */
        init: function ($elem, options) {
            $container = $elem;
            $.extend(settings, options);
        },

        /**
         * This will display a prompt to the user with the specified text.
         *
         * @param text The text to display.
         * @param options Optional JS object of options:
         *        timeout:  An optional timeout in milliseconds.  If none is
         * specified, the default will be used.  Specify 0 to require the user
         * click through.
         *        resolve: Text for the button that will resolve the deferred.
         *        reject: Text for the button that will reject the deferred.
         *
         * @return A Promise that will be resolved if the user accepts, or
         * rejected if the user cancels.
         */
        prompt: function (text, options) {
            options = $.extend({}, settings, options);
            var dfd = new $.Deferred().always(function () {
                hide();
            }),

                $resolve = $('<input />')
                .attr({type: 'button',
                       value: options.resolve})
                .bind('click', function () { dfd.resolve(); }),

                $reject = $('<input />')
                .attr({type: 'button',
                       value: options.reject})
                .bind('click', function () { dfd.reject(); }),

                $content = $('<div />')
                .append($('<div />')
                        .text(text))
                .append($resolve)
                .append($reject);

            show($content);

            if (options.timeout > 0) {
                setTimeout(function () { dfd.reject(); }, options.timeout);
            }

            return dfd.promise();
        },

        /**
         * Tell the user that something went wrong.
         *
         * @param warning The String warning to display.
         * @param options Optional JS object of options:
         *        timeout:  An optional timeout in milliseconds.  If none is
         * specified, the default will be used.  Specify 0 to require the user
         * click through.
         *        ok: Text for the OK button
         *
         * @return A promise that will be resolved when the user closes the
         * warning, or it times out.
         */
        warn: function (warning, options) {
            options = $.extend({}, settings, options);
            var dfd = new $.Deferred().always(function () {
                hide();
            }),
                $button = $('<input />')
                .attr({'type': 'button',
                       'value': options.ok})
                .bind('click', function () { dfd.resolve(); }),
                $content = $('<div />')
                .append($('<div />')
                        .text(warning))
                .append($button);

            show($content);

            if (options.timeout > 0) {
                setTimeout(function () { dfd.resolve(); }, options.timeout);
            }

            return dfd.promise();
        }
    };
});