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
/*globals require*/

(function () {
    "use strict";

    require([
        'views/openscrape.map',
        'lib/backbone',
        'lib/jquery'
    ], function (MapView, backbone) {
        var $ = require('jquery'),
            mapView = new MapView({
                el: $('#map')[0]
            });

        backbone.sync = function (method, model, options) {

            var resp,
                store = model.store || model.collection.store;

            switch (method) {
            case "read":    resp = model.id ? store.find(model) : store.findAll(); break;
            case "create":  resp = store.create(model);                            break;
            case "update":  resp = store.update(model);                            break;
            case "delete":  resp = store.destroy(model);                           break;
            }

            if (resp) {
                options.success(resp);
            } else {
                options.error("Record not found");
            }
        };

        /**
         Handle download request.

         Compresses all stylesheets into text, adds them to the SVG before hitting download.

         Won't work if browser doesn't support 'data:' scheme.
         **/
        // $(downloadSelector).click(function () {
        //     var styleText = _.reduce(document.styleSheets, function (memo, sheet) {
        //         return sheet.disabled === false ? memo + $(sheet).css2txt()[0] : memo;
        //     }, '');
        //     $('svg').attr('xmlns', "http://www.w3.org/2000/svg")
        //         .attr('xmlns:xlink', "http://www.w3.org/1999/xlink")
        //         .prepend($('<style />')
        //                  .attr('type', 'text/css')
        //                  .text('<![CDATA[  ' + styleText + '  ]]>'))
        //         .download(alert.warn);
        // });
    });
}());