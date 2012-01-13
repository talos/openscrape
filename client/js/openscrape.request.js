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
    // PRIVATE
    var $queue = $({}), // generic queue

    request_path = "/request"; //Path to hit caustic backend.

    $.ajaxSetup({ timeout: 40000 });

    // PUBLIC
    /**
       Request <code>instruction</code>.

       @param id The String ID of the request.  Used to get tags.
       @param instruction A String instruction.
       @param force Whether to force a load.
       @param uri URI to resolve instruction references against.  Optional.
       @param input Input String.  Optional.

       @param A Promise that wil be resolved with the response when
       the request is done.
    **/
    openscrape.request = function(id, instruction, force, uri, input) {
        var dfd = $.Deferred();

        $queue.queue('caustic', function() {
            $.post(request_path,
                   JSON.stringify({
                       "id": id,
                       "uri": uri,
                       "instruction": instruction,
                       "cookies": openscrape.data.getCookies(id),
                       "tags" : openscrape.data.getTags(id),
                       "input": input, // Stringify drops this key if undefined.
                       "force": String(force)}))
                .done(function(resp, status, doc) {
                    dfd.resolve(JSON.parse(doc.responseText));
                    //saveResponse(id, JSON.parse(resp));
                    //redraw(id);
                })
                .fail(function(resp) {
                    openscrape.warn("Request for " + instruction + " failed: " + resp.statusText);
                    dfd.reject(resp);
                })
                .always(function() {
                    $queue.dequeue('caustic');
                })
        });

        // Non-fx queues are not auto-run.
        if($queue.queue('caustic').length == 1) {
            $queue.dequeue('caustic');
        }

        return dfd.promise();
    };
})();