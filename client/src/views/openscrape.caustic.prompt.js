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
/*globals define*/
/*jslint nomen: true*/

define([
    'require',
    'lib/underscore',
    'models/openscrape.prompt',
    'views/openscrape.prompt',
    'openscrape.caustic.proxy',
    'openscrape.caustic.applet',
    'lib/jquery'
], function (require, _, PromptModel, PromptView, proxy, applet) {
    "use strict";

    /**
     * A View to let the user activate a CausticCollection
     */
    return PromptView.extend({

        initialize: function (options) {
            this.model = new PromptModel({
                text: 'Scraping hits external servers. You can'
                    + ' either proxy through my server (which is slower'
                    + ' and costs me!) or you can use the applet.  If'
                    + ' you use the applet, you may have to confirm'
                    + ' its permissions with an annoying pop-up dialog box.',
                resolve: 'Applet',
                reject: 'Proxy'
            });

            PromptView.prototype.initialize.call(this, options);

            var collection = this.collection;

            collection.on('request', _.bind(function () {
                this.render();
            }, this));

            this.model.on('resolved', _.bind(function () {
                applet.enable().done(function () {
                    collection.enable(applet.request);
                }).fail(function () {
                    collection.enable(proxy.request);
                }).always(_.bind(function () {
                    this.remove();
                }, this));
            }, this));

            this.model.on('rejected', _.bind(function () {
                collection.enable(proxy.request);
                this.remove();
            }, this));
        }
    });
});
