/*jslint browser:true*/
/*globals mocha*/
require.config({
    baseUrl: '../src'
});
(function () {
    "use strict";
    require([
        'require',
        'lib/jquery',
        '../test/vendor/mocha',
        '../test/caustic.test',
        '../test/models/instruction.test'
    ], function (require) {
        var $ = require('jquery');
        $(document).ready(function () {
            mocha.run();
        });
    });
}());
