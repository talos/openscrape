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
    'lib/json2',
    './openscrape.caustic.proxy',
    './openscrape.caustic.applet',
    './openscrape.queue',
    'models/openscrape.prompt',
    'views/openscrape.prompt',
    'models/openscrape.warning',
    'views/openscrape.warning',
    'lib/jquery'
], function (require, _, json, proxy, applet, Queue,
             PromptModel, PromptView, WarningModel, WarningView) {
    "use strict";

    var $ = require('jquery');

    function Caustic(requester) {
        this.requester = requester;
        this.$el = $el;
        this.queue = new Queue('caustic');
        this.prompt = new PromptModel({
            text: 'Scraping hits external servers. You can'
                + ' either proxy through my server (which is slower'
                + ' and costs me!) or you can use the applet.  If'
                + ' you use the applet, you may have to confirm'
                + ' its permissions with an annoying pop-up dialog box.',
            resolve: 'Applet',
            reject: 'Proxy'
        });

        this.prompt.on('resolved', _.bind(function () {
            applet.enable().done(_.bind(function () {
                this.requester = applet.request;
            }, this)).fail(_.bind(function () {
                new WarningView({
                    model: new WarningModel({
                        text: "Applet error, using proxy."
                    })
                }).render().$el.appendTo(this.$el);
                this.requester = proxy.request;
            }, this)).always(_.bind(function () {

                this.queue.start();
            }, this));
        }, this));

        this.prompt.on('rejected', _.bind(function () {
            this.requester = proxy.request;
            this.queue.start();
        }, this));

        this.scrape = _.bind(this.scrape, this);
    }

    /**
     * Scrape a request, hooking into backbone.js's sync interface.
     *
     * @param {String} method CRUD method.  Delete is not supported, and the
     * other three all map to a request.
     * @param {CausticModel} model the Caustic model to sync
     * @param {Object} options
     *
     * @return {Promise} that will be resolved with the raw JS object
     * of the response when the request is done, or rejected with a
     * reason for why it failed.
     **/
    Caustic.prototype.sync = function (method, model, options) {
        if (!this.requester) {
            new PromptView({ model: this.prompt })
                .render().$el.prependTo(this.$el);
        }

        switch (method) {
        case 'create':
        case 'read':
        case 'update':
            var dfd = new $.Deferred(),
                requestStr = json.stringify(model.toJSON());

            this.queue.queue(_.bind(function (next) {
                this.requester(requestStr)
                    .done(function (jsonResp) {
                        dfd.resolve(json.parse(jsonResp));
                    })
                    .fail(function (msg) {
                        dfd.reject(msg);
                    })
                    .always(function () {
                        next(); // next on the line
                    });
            }, this));
            break;
        case 'delete':
            throw new Error('Cannot delete CausticModel, it is not persisted');
        }

        return dfd.promise();
    };

    return Caustic;
});
