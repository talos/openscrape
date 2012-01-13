var openscrape;

openscrape || (openscrape={}); // Define openscrape if not yet defined

(function() {
    var $mouse = $(),
    maxWidth = 0,
    maxHeight = 0;

    openscrape.mouse = {

        /**
           Initialize the singleton openscrape.mouse .  Can only be called once.

           @param el The element to use for the mouse.
           @param w The maximum width of the mouse div.
           @param h The maximum height of the mouse div.
        **/
        init: function(el, w, h) {
            if($mouse.length > 0) { return ; }

            $mouse = $(el),
            maxWidth = w,
            maxHeight = h;

            /**
               Bind global mouse move to manipulating the $mouse element.
            **/
            $("body").bind('mousemove', function(evt) {
                if($mouse.is(':visible')) {
                    $mouse.css({
                        "left": evt.pageX + "px",
                        "top": evt.pageY + "px"
                    });
                }
            });
        },

        _resize: function() {
            // depends on jquery-rescale
            $mouse.rescale(maxWidth, maxHeight, false, -1);
        },

        /**
           Replace the mouse div content text.

           @param text The text to put in the mouse div.
        **/
        setText: function(text) {
            $mouse.empty().text(text);
            this._resize();
        },

        /**
           Replace the mouse div content with some arbitrary HTML.  The
           DOM will be searched to ensure that it has no <title>
           elements hanging out.

           @param text The text to put in the mouse div.
        **/
        setHTML: function(html) {
            var $container = $('<div />').html(html);
            $container.find('title').remove();
            $mouse.empty().append($container);
            this._resize();
        },

        /**
           Show the div.
        **/
        show: function() {
            $mouse.show();
        },

        /**
           Hide the div.
        **/
        hide: function() {
            $mouse.hide();
        }
    };
})();