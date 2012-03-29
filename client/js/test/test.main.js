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
        '../test/collections/nodes.test',
        '../test/models/node.test'
    ], function (require) {
        var $ = require('jquery');
        $(document).ready(function () {
            mocha.run();
        });
    });
}());
