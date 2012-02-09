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
    'lib/jquery'
], function (require, _) {
    "use strict";

    var $ = require('jquery');

    return (function () {

        /**
         * An auto-running wrapper for jQuery's queue.  Automatically
         * dequeues ASAP once start() has been called.
         */
        function Queue(name) {
            this.name = name;
            this._queue = $({});
            this.started = false;
            _.bind(this.start, this);
            _.bind(this.queue, this);
        }

        Queue.prototype.start = function () {
            this.started = true;
            this._queue.dequeue(this.name); // kickstart
        };

        /**
         * @param {function} func This will be called with a single
         * argument, the next item in the queue.
         */
        Queue.prototype.queue = function (func) {
            this._queue.queue(this.name, func);
            if (this.started === true && this._queue.queue(this.name).length === 1) {
                this._queue.dequeue(this.name);
            }
        };

        return Queue;
    }());
});
