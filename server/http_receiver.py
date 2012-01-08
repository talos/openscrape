#!/usr/bin/env python

"""
Caustic viz server.

This communicates with a Caustic ZMQ server via IPC.
"""

import zmq
import ast
import json
from brubeck.request_handling import Brubeck, WebMessageHandler

# The IPC address of the caustic backend
BACKEND_URI = "ipc://caustic.ipc"
CONTEXT = zmq.Context.instance()

class RequestHandler(WebMessageHandler):
    """
    RequestHandler takes a single POSTed request as JSON, passes it on
    the wire to the ZMQ caustic server, then returns the response when
    it is ready.
    """

    def post(self):
        json_request = self.message.body
        try:
            # connect to backend
            sock = CONTEXT.socket(zmq.REQ)
            sock.connect(BACKEND_URI)
            #request_obj = ast.literal_eval(json_request)
            #sock.send_json(request_obj)
            sock.send(json_request)

            resp = sock.recv()  # asynchronicity++

            self.set_body(resp)

            # TODO this extra to/from JSON conversion is pointless
            #self._payload = json.loads(resp)
        except Exception as e:
            #self.set_body("Invalid JSON Request: '%s'" % self.message)
            self.set_status(400,
                            status_msg="Invalid JSON Request from message: '%s', error '%s'"
                            % (json_request, e))

        return self.render()

urls = [(r'^/request$', RequestHandler)]

config = {
    'mongrel2_pair': ('ipc://127.0.0.1:9999', 'ipc://127.0.0.1:9998'),
    'handler_tuples': urls }

app = Brubeck(**config)
app.run()
