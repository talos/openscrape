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

/*global define, document*/

define([
    './openscrape.mouse',
    './openscrape.map',
    './openscrape.marker',
    './openscrape.visual',
    './openscrape.request',
    './openscrape.instruction',
    './openscrape.alert',
    'lib/jquery',
    'lib/underscore',
    'lib/jquery-css2txt',
    'lib/jquery-download'
], function (mouse, Map, Marker, Visual, request, instruction, alert, $, underscore) {
    "use strict";

    return {

        /**
         * Initialize the openscrape user interface.
         *
         * @param r The pixel radius to use for visuals.
         * @param alertSelector The CSS selector for the alert box.
         * @param downloadSelector The CSS selector for the download button.
         * @param mouseSelector The CSS selector for the follow-mouse element.
         * @param mapSelector The CSS selector for the map.
         * @param resetSelector The CSS selector for the reset button.
         */
        init: function (r,
                        alertSelector,
                        downloadSelector,
                        mapSelector,
                        mouseSelector,
                        resetSelector) {

            var visual, map, marker;

            alert.init($(alertSelector));

            // Set up the mouse-following div
            mouse.init($(mouseSelector), 300, 800);

            visual = new Visual(r);
            map = new Map($(mapSelector)[0], 40.77, -73.98, 11);
            marker = new Marker(map, visual.getSVG());

            // If the map is clicked and there is no visual, request
            // the address and draw one.
            map.addAddressListener(function (address) {
                if (!marker.isVisible()) {
                    request(instruction.property(address), address, {}, true, '')
                        .done(function (resp) {
                            marker.setPosition(address.latLng).show();
                            visual.setResponse(resp).render();
                        });
                }
            });

            // Destroy the visual, then hid the marker, upon reset.
            $(resetSelector).bind('click', function () {
                visual.destroy().done(function () {
                    marker.hide();
                });
            });

            /**
             Handle download request.

             Compresses all stylesheets into text, adds them to the SVG before hitting download.

             Won't work if browser doesn't support 'data:' scheme.
             **/
            // $(downloadSelector).click(function () {
            //     var styleText = underscore.reduce(document.styleSheets, function (memo, sheet) {
            //         return sheet.disabled === false ? memo + $(sheet).css2txt()[0] : memo;
            //     }, '');
            //     $('svg').attr('xmlns', "http://www.w3.org/2000/svg")
            //         .attr('xmlns:xlink', "http://www.w3.org/1999/xlink")
            //         .prepend($('<style />')
            //                  .attr('type', 'text/css')
            //                  .text('<![CDATA[  ' + styleText + '  ]]>'))
            //         .download(alert.warn);
            // });
        }
    };
});