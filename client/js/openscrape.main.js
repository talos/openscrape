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

/*globals require*/

(function () {
    "use strict";

    var r = 600,
        alertSelector = '#alert',
        downloadSelector = '#download',
        mapSelector = '#map',
        mouseSelector = '#mouse',
        resetSelector = '#reset';

    require([
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
    ], function (Mouse, Map, Marker, Visual, request, instruction, alert, $, underscore) {

        var visual, map, marker,
            mouse = new Mouse($(mouseSelector), 300, 800);

        alert.init($(alertSelector));

        visual = new Visual(r);
        map = new Map($(mapSelector)[0], 40.77, -73.98, 11);
        marker = new Marker(map, visual.getSVG());

        // If the map is clicked and there is no visual, request
        // the address and draw one.
        map.addAddressListener(function (address) {
            if (!marker.isVisible()) {
                request(instruction.property(address),
                        { Apt: '',
                          Number: address.number,
                          Street: address.street,
                          Borough: address.borough },
                        {}, true, '')
                    .done(function (resp) {
                        marker.setPosition(address.lat, address.lng).show();
                        visual.setResponse(resp).render();
                    });
            }
        });

        // Destroy the visual, then hide the marker, upon reset.
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
    });
}());