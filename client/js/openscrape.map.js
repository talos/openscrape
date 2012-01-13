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

(function() {
    openscrape.map = function(canvas, provider) {
        // initialise the map with your choice of API
        var mapstraction = new mxn.Mapstraction(canvas, provider);

        // create a lat/lon object
        var myPoint = new mxn.LatLonPoint(37.404196,-122.008194);

        // display the map centered on a latitude and longitude (Google zoom levels)
        mapstraction.setCenterAndZoom(myPoint, 9);

        mapstraction.addControls({
            pan: true, 
            zoom: 'small',
            map_type: true 
        });
        // create a marker positioned at a lat/lon 
        // my_marker = new mxn.Marker(myPoint);

        // my_marker.setIcon('http://mapstraction.com/icon.gif');

        // mapstraction.addMarker( new mxn.Marker( new mxn.LatLonPoint(37.75,-122.44)));

        // // add a label to the marker
        // my_marker.setLabel("<blink>Hello!</blink>");
        // var text = "<b>Be Happy!</b>";

        // // add info bubble to the marker
        // my_marker.setInfoBubble(text);

        // // display marker 
        // mapstraction.addMarker(my_marker);
        // var foo = function() { mapstraction.removeMarker(my_marker); };
    };
})();
