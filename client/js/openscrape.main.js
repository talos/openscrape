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
        'require',
        'models/openscrape.map',
        'views/openscrape.map',
        'lib/backbone',
        './openscrape.sync',
        'lib/jquery'
    ], function (require, MapModel, MapView, backbone) {
        var $ = require('jquery');

        return (new (backbone.View.extend({

            el: $('#openscrape'),

            events: {
                'click .toggle': 'toggle'
            },

            initialize: function () {
                this.mapModel = new MapModel({
                    lat: 40.77,
                    lng: -73.98
                });
                this.$el.append(new MapView({
                    model: this.mapModel
                }).$el);
            },

            toggle: function () {
                this.mapModel.toggle();
            }
        }))());
    });
}());


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
//    });
//}());