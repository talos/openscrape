/*globals define, mocha*/
define([
    'require',
    '../test/vendor/chai',
    '../test/vendor/sinon-chai',
    '../test/vendor/mocha'
], function (require, chai, sinonChai) {
    "use strict";
    mocha.setup('bdd');
    chai.should();
    chai.use(sinonChai);
});
