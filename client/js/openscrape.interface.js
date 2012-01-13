var openscrape;

openscrape || (openscrape={}); // Define openscrape if not yet defined

(function(){
    openscrape['interface'] = function(r, svgSelector,
                                       requestSelector,
                                       instructionSelector,
                                       tagSelector,
                                       downloadSelector,
                                       mouseSelector,
                                      viewportId) {

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

        /**
           Handle form request.
        **/
        $(requestSelector).submit(function() {
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
