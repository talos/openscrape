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

/*globals define, mocha, sinon, before, after, beforeEach,
afterEach:true,
 beforeEach, afterEach, describe, it, expect*/

define([
    'require',
    '../test/vendor/chai',
    '../test/vendor/sinon-chai',
    '../test/vendor/mocha',
    'lib/jquery'
], function (require, chai, sinonChai) {
    "use strict";
    var $ = require('jquery');

    mocha.setup({
        ui: 'bdd',
        globals: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
                    'XMLHttpRequest']
    });

    before(function () {
        this.clock = sinon.useFakeTimers();
        this.expect = chai.expect;
        chai.should();
        chai.use(sinonChai);
    });

    beforeEach(function () {
        this.$dom = $('<div />')
            .attr('id', 'test')
            .appendTo($('body'));
    });

    afterEach(function () {
        this.$dom.empty().remove();
    });

    after(function () {
        this.clock.restore();
    });
});
