#!/usr/bin/env python

"""
Caustic viz server.

This communicates with a Caustic ZMQ server via IPC.
"""

import zmq
from brubeck.request_handling import Brubeck, WebMessageHandler

# The IPC address of the caustic backend
CAUSTIC_BACKEND = "ipc://caustic"

class RequestHandler(JSONMessageHandler):
    """
    RequestHandler takes a single POSTed request as JSON, passes it on
    the wire to the ZMQ caustic server, then returns the response when
    it is ready.
    """

    sock = zmq.Context.instance().socket(zmq.REQ).connect(CAUSTIC_BACKEND)

    def post(self):
        try:
            request_obj = ast.literal_eval(self.message)
            self.sock.send_json(request_obj)
            resp = self.sock.recv()  # asynchronicity++
            self.set_body(resp)
        except:
            self.set_body("Invalid JSON Request: '%s'" % request_obj)
            self.set_status(400)

        return self.render()

urls = [(r'^/request$', RequestHandler)]

config = {
    'mongrel2_pair': ('ipc://127.0.0.1:9999', 'ipc://127.0.0.1:9998'),
    'handler_tuples': urls }

app = Brubeck(**config)
app.run()
