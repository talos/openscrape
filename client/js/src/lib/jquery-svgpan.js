/**
   THIS LICENSE IS FOR JQUERY-SVGPAN.  The original SVGPan library,
   from which it derived, is governed by the second license below.

   Copyright 2012 John Krauss. All rights reserved.

   Redistribution and use in source and binary forms, with or without
   modification, are permitted provided that the following conditions
   are met:

   1. Redistributions of source code must retain the above copyright
   notice, this list of conditions and the following disclaimer.

   2. Redistributions in binary form must reproduce the above
   copyright notice, this list of conditions and the following
   disclaimer in the documentation and/or other materials provided
   with the distribution.

   THIS SOFTWARE IS PROVIDED BY JOHN KRAUSS ''AS IS'' AND ANY EXPRESS
   OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
   WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
   ARE DISCLAIMED. IN NO EVENT SHALL JOHN KRAUSS OR CONTRIBUTORS BE
   LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
   CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT
   OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR
   BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
   LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
   (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE
   USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH
   DAMAGE.

   The views and conclusions contained in the software and
   documentation are those of the authors and should not be
   interpreted as representing official policies, either expressed or
   implied, of John Krauss.
**/

// SVGPan library 1.2.2 license and documentation:

/** 
 *  SVGPan library 1.2.2
 * ======================
 *
 * Given an unique existing element with id "viewport" (or when missing, the 
 * first g-element), including the the library into any SVG adds the following 
 * capabilities:
 *
 *  - Mouse panning
 *  - Mouse zooming (using the wheel)
 *  - Object dragging
 *
 * You can configure the behaviour of the pan/zoom/drag with the variables
 * listed in the CONFIGURATION section of this file.
 *
 * Known issues:
 *
 *  - Zooming (while panning) on Safari has still some issues
 *
 * Releases:
 *
 * 1.2.2, Tue Aug 30 17:21:56 CEST 2011, Andrea Leofreddi
 *    - Fixed viewBox on root tag (#7)
 *    - Improved zoom speed (#2)
 *
 * 1.2.1, Mon Jul  4 00:33:18 CEST 2011, Andrea Leofreddi
 *    - Fixed a regression with mouse wheel (now working on Firefox 5)
 *    - Working with viewBox attribute (#4)
 *    - Added "use strict;" and fixed resulting warnings (#5)
 *    - Added configuration variables, dragging is disabled by default (#3)
 *
 * 1.2, Sat Mar 20 08:42:50 GMT 2010, Zeng Xiaohui
 *    Fixed a bug with browser mouse handler interaction
 *
 * 1.1, Wed Feb  3 17:39:33 GMT 2010, Zeng Xiaohui
 *    Updated the zoom code to support the mouse wheel on Safari/Chrome
 *
 * 1.0, Andrea Leofreddi
 *    First release
 *
 * This code is licensed under the following BSD license:
 *
 * Copyright 2009-2010 Andrea Leofreddi <a.leofreddi@itcharm.com>. All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, are
 * permitted provided that the following conditions are met:
 * 
 *    1. Redistributions of source code must retain the above copyright notice, this list of
 *       conditions and the following disclaimer.
 * 
 *    2. Redistributions in binary form must reproduce the above copyright notice, this list
 *       of conditions and the following disclaimer in the documentation and/or other materials
 *       provided with the distribution.
 * 
 * THIS SOFTWARE IS PROVIDED BY Andrea Leofreddi ``AS IS'' AND ANY EXPRESS OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 * FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL Andrea Leofreddi OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
 * ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * 
 * The views and conclusions contained in the software and documentation are those of the
 * authors and should not be interpreted as representing official policies, either expressed
 * or implied, of Andrea Leofreddi.
 */
/*jslint browser: true*/
/*global define*/

// (function (factory) {
//     "use strict";
//     if (typeof define === 'function' && define.amd) {
//         // AMD. Register as an anonymous module.
//         define(['jquery'], factory);
//     } else {
//         // Browser globals
//         factory(jQuery);
//     }
// }(function ($) {
define(['require', 'lib/jquery'], function (require) {
    "use strict";

    var $ = require('jquery'),
        Mousewheel = (function () {
            function Mousewheel() {
                var self = this;
                this.watching = [];
                this.trigger = function () { Mousewheel.prototype.trigger.apply(self, arguments); };
                this.watch = function () { Mousewheel.prototype.watch.apply(self, arguments); };
            }

            Mousewheel.prototype.trigger = function (evt) {
                var i = 0,
                    len = this.watching.length;

                // Iterate through what we're watching & hit callbacks
                while (i < len) {
                    this.watching[i][1](evt);
                    i += 1;
                }
            };

            /**
             * Watch an element with a callback.  This will also do cleanup on the
             * watched elements.
             *
             * @param $el {DOM} A jQuery-fied DOM element.
             * @param callback A callback to call with the mousewheel event when it
             * happens.
             */
            Mousewheel.prototype.watch = function ($el, callback) {
                var i = 0;
                while (i < this.watching.length) {
                    if (this.watching[i][0].closest('html').length === 0) {
                        this.watching.splice(i, 1);
                        i -= 1;
                    }
                    i += 1;
                }

                this.watching.push([$el, callback]);
            };

            return Mousewheel;
        }()),

        mousewheel = new Mousewheel(),

        init = function (root, svgRoot, enablePan, enableZoom, enableDrag, zoomScale) {
            var state = 'none',
                stateTarget,
                stateOrigin,
                stateTf,
                svgDoc = root,

                $root = $(root),
                isMouseOverElem = false,
                undrawnDelta = 0, // we may take mouse input faster than it can be
                //drawn, so we save undrawn deltas here.
                fps = 30, // maximum redraw speed.
                drawing = false,
                drawingTimer,

                canDraw = function () {
                    if (!drawing) {
                        clearTimeout(drawingTimer);
                        drawingTimer = setTimeout(function () {
                            drawing = false;
                        }, 1000 / fps);
                        drawing = true;
                        return false;
                    } else {
                        return true;
                    }
                },

                /**
                 * Instance an SVGPoint object with given event coordinates.
                 */
                getEventPoint = function (evt) {
                    var p = root.createSVGPoint();

                    p.x = evt.clientX;
                    p.y = evt.clientY;

                    return p;
                },

                /**
                 * Sets the current transform matrix of an element.
                 */
                setCTM = function (element, matrix) {
                    setTimeout(function () {
                        var s = "matrix(" + matrix.a + "," + matrix.b + "," + matrix.c + "," + matrix.d + "," + matrix.e + "," + matrix.f + ")";

                        element.setAttribute("transform", s);
                    }, 0);
                },

                /**
                 * Dumps a matrix to a string (useful for debug).
                 */
                // dumpMatrix = function (matrix) {
                //     var s = "[ " + matrix.a + ", " + matrix.c + ", " + matrix.e + "\n  " + matrix.b + ", " + matrix.d + ", " + matrix.f + "\n  0, 0, 1 ]";

                //     return s;
                // },

                /**
                 * Handle mouseenter event.  This has been added to stop ignoring
                 * inputs when the mouse is over the element.
                 **/
                handleMouseEnter = function (evt) {
                    isMouseOverElem = true;
                },

                /**
                 * Handle mouseleave event.  This has been added to ignore
                 * inputs when the mouse is not over the element.
                 **/
                handleMouseLeave = function (evt) {
                    state = 'none'; // kill panning when we leave element

                    isMouseOverElem = false;
                },

                /**
                 * Handle mouse wheel event.
                 */
                handleMouseWheel = function (evt) {
                    if (!enableZoom) {
                        return;
                    }

                    // added, we only hit this if we're over this particular element
                    if (!isMouseOverElem) {
                        return;
                    }

                    if (evt.preventDefault) {
                        evt.preventDefault();
                    }

                    evt.returnValue = false;

                    var delta = (evt.wheelDelta ? evt.wheelDelta / 360 : evt.detail / -9) + undrawnDelta,
                        z,
                        p,
                        k;

                    if (canDraw()) {
                        z = Math.pow(1 + zoomScale, delta);
                        p = getEventPoint(evt).matrixTransform(svgRoot.getCTM().inverse());

                        // Compute new scale matrix in current mouse position
                        k = root.createSVGMatrix().translate(p.x, p.y).scale(z).translate(-p.x, -p.y);

                        setCTM(svgRoot, svgRoot.getCTM().multiply(k));

                        if (typeof stateTf === "undefined") {
                            stateTf = svgRoot.getCTM().inverse();
                        }

                        stateTf = stateTf.multiply(k.inverse());

                        undrawnDelta = 0;
                    } else {
                        undrawnDelta = delta;
                    }
                },

                /**
                 * Handle mouse move event.
                 */
                handleMouseMove = function (evt) {

                    if (evt.preventDefault) {
                        evt.preventDefault();
                    }

                    if (canDraw()) {
                        evt.returnValue = false;

                        var p;

                        if (state === 'pan' && enablePan) {
                            // Pan mode
                            p = getEventPoint(evt).matrixTransform(stateTf);

                            setCTM(svgRoot, stateTf.inverse().translate(p.x - stateOrigin.x, p.y - stateOrigin.y));
                        } else if (state === 'drag' && enableDrag) {
                            // Drag mode
                            p = getEventPoint(evt).matrixTransform(svgRoot.getCTM().inverse());

                            setCTM(stateTarget,
                                   root.createSVGMatrix().translate(p.x - stateOrigin.x, p.y - stateOrigin.y).multiply(svgRoot.getCTM().inverse()).multiply(stateTarget.getCTM()));

                            stateOrigin = p;
                        }
                    }
                },

                /**
                 * Handle click event.
                 */
                handleMouseDown = function (evt) {
                    if (evt.preventDefault) {
                        evt.preventDefault();
                    }

                    evt.returnValue = false;

                    // bind our mousemove listener only when we have a mousedown
                    //$root.bind('mousemove', handleMouseMove );

                    //var svgDoc = evt.target.ownerDocument;

                    //var g = getRoot(svgDoc);
                    var g = svgRoot;

                    // Pan anyway when drag is disabled and the user clicked on an element
                    if (evt.target.tagName === "svg" || !enableDrag) {
                        // Pan mode
                        state = 'pan';

                        stateTf = g.getCTM().inverse();

                        stateOrigin = getEventPoint(evt).matrixTransform(stateTf);
                    } else {
                        // Drag mode
                        state = 'drag';

                        stateTarget = evt.target;

                        stateTf = g.getCTM().inverse();

                        stateOrigin = getEventPoint(evt).matrixTransform(stateTf);
                    }
                },

                /**
                 * Handle mouse button release event.
                 */
                handleMouseUp = function (evt) {
                    if (evt.preventDefault) {
                        evt.preventDefault();
                    }

                    evt.returnValue = false;

                    // unbind our mousemove listener immediately when we have a mouseup
                    //$root.unbind('mousemove', handleMouseMove );

                    //var svgDoc = evt.target.ownerDocument;

                    if (state === 'pan' || state === 'drag') {
                        // Quit pan mode
                        state = '';
                    }
                };

            /**
             * Register handlers
             */

            // MODIFICATION: registers events through jQuery
            $root.bind('mouseup', handleMouseUp)
                .bind('mousedown', handleMouseDown)
                .bind('mousemove', handleMouseMove) // this is now bound & unbound upon mousedown & mouseup
                .bind('mouseenter', handleMouseEnter) // added 
                .bind('mouseleave', handleMouseLeave); // added

            mousewheel.watch($root, handleMouseWheel);
        };

    if ($.browser.webkit) {
        window.addEventListener('mousewheel', mousewheel.trigger, false); // Chrome/Safari
    } else {
        window.addEventListener('DOMMouseScroll', mousewheel.trigger, false); // Others
    }

    /**
     * Enable SVG panning on an SVG element.
     *
     * @param viewportId the ID of an element to use as viewport for pan.  Required.
     * @param enablePan Boolean enable or disable panning (default enabled)
     * @param enableZoom Boolean enable or disable zooming (default enabled)
     * @param enableDrag Boolean enable or disable dragging (default disabled)
     * @param zoomScale Float zoom sensitivity, defaults to .2
    ***/
    $.fn.svgPan = function (viewportId, enablePan, enableZoom, enableDrag, zoomScale) {
        enablePan = typeof enablePan !== 'undefined' ? enablePan : true;
        enableZoom = typeof enableZoom !== 'undefined' ? enableZoom : true;
        enableDrag = typeof enableDrag !== 'undefined' ? enableDrag : false;
        zoomScale = typeof zoomScale !== 'undefined' ? zoomScale : 0.2;

        return $.each(this, function (i, el) {
            var $el = $(el),
                svg,
                viewport;
            // only call upon elements that are SVGs and haven't already been initialized.
            if ($el.is('svg') && $el.data('SVGPan') !== true) {
                viewport = $el.find('#' + viewportId)[0];
                if (viewport) {
                    init($el[0], viewport, enablePan, enableZoom, enableDrag, zoomScale);
                } else {
                    throw "Could not find viewport with id #" + viewport;
                }
            }
        });
    };
});
