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

var openscrape;

openscrape || (openscrape={}); // Define openscrape if not yet defined

(function(){
    openscrape['interface'] = function(r, svgSelector,
                                       requestSelector,
                                       instructionSelector,
                                       tagSelector,
                                       downloadSelector,
                                       mouseSelector,
                                       mapId) {

        // Set up our svg
        var svg = d3.select(svgSelector).append("svg")
            .attr("width", r * 2)
            .attr("height", r * 2),
        viewportId = 'viewport',
        viewport = svg.append('g')
            .attr('id', viewportId);

        $(svg).svgPan(viewportId);

        // Set up the mouse-following div
        openscrape.mouse.init($(mouseSelector));

        // Set up the map.
        openscrape.map(mapId, 'googlev3');

        /**
           Handle request click.
        **/
        $(requestSelector).click(function() {
            try {
                var instruction = $(instructionSelector).val(),
                id = openscrape.data.newId();
                openscrape.data.saveTags(id, JSON.parse($(tagSelector).val()));

                openscrape.request(id, instruction, true, window.location.href)
                    .done(function(resp) {
                        openscrape.data.saveResponse(id, resp);
                        openscrape.visualize(viewport, id, r, r, r);
                    });
            } catch(err) {
                if(err instanceof SyntaxError) {
                    openscrape.warn("Bad JSON for tags: " + err.message);
                } else {
                    openscrape.warn("Unknown error constructing request: " + err.message);
                    console.log(err.stack);
                }
            }
            return false;
        });

        /**
           Handle download request.

           Compresses all stylesheets into text, adds them to the SVG before hitting download.

           Won't work if browser doesn't support 'data:' scheme.
        **/
        $(downloadSelector).click(function() {
            var styleText = _.reduce(document.styleSheets, function(memo, sheet) {
                return sheet.disabled === false ? memo + css2txt(sheet) : memo;
            }, '');
            $(svg).attr('xmlns', "http://www.w3.org/2000/svg")
                .attr('xmlns:xlink', "http://www.w3.org/1999/xlink")
                .prepend($('<style />')
                         .attr('type', 'text/css')
                         .text('<![CDATA[  ' + styleText + '  ]]>'))
                .download(openscrape.warn);
        });
    };
})();
