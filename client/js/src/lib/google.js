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

/*global define, google*/

require({
    waitSeconds: 15, // raise ceiling on time for google to load
    paths: {
        async: './lib/require-async'
    }
});

// location of google library
define([
    "async!http://maps.googleapis.com/maps/api/js?key=AIzaSyDPnsYhtQfJdZ9rzRnTPTx4H-8jDzcDjbk&sensor=false&libraries=places"
], function () {
    "use strict";
    return google; // chillin globally
});
