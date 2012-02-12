#!/usr/bin/env python

"""
Caustic viz server.

This communicates with a Caustic ZMQ server via IPC.
"""

import zmq
import sys
from ConfigParser import SafeConfigParser
from brubeck.request_handling import Brubeck, WebMessageHandler

###
#
# CONFIG
#
###
if len(sys.argv) != 2:
    print """
Openscrape proxy must be invoked with a single argument, telling it
which mode from `config.ini` to use:

python server/proxy.py <MODE>

Look at `config.ini` for defined modes. Defaults are `production`,
`staging`, and `test`."""
    exit(1)

MODE = sys.argv[1]
PARSER = SafeConfigParser()
RECV_SPEC = 'recv_spec'
SEND_SPEC = 'send_spec'

if not len(PARSER.read('config.ini')):
    print "No config.ini file found in this directory.  Writing a config..."

    modes = ['production', 'staging', 'test']
    for i in range(0, len(modes)):
        mode = modes[i]
        PARSER.add_section(mode)
        PARSER.set(mode, RECV_SPEC, 'ipc://caustic_proxy:9003')
        PARSER.set(mode, SEND_SPEC, 'ipc://caustic_proxy:9002')

    try:
        conf = open('config.ini', 'w')
        PARSER.write(conf)
        conf.close()
    except IOError:
        print "Could not write config file to `config.ini`, exiting..."
        exit(1)

config = {
    RECV_SPEC: PARSER.get(MODE, RECV_SPEC),
    SEND_SPEC: PARSER.get(MODE, SEND_SPEC),
}

# The IPC address of the caustic backend
BACKEND_URI = "ipc://caustic.ipc"
CONTEXT = zmq.Context.instance()

class RequestHandler(WebMessageHandler):
    """
    RequestHandler takes a single POSTed request as JSON, passes it on
    the wire to the ZMQ caustic backend, then returns the response when
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

            resp = sock.recv()

            self.set_body(resp)
        except Exception as e:
            self.set_status(400,
                            status_msg="Invalid JSON Request: '%s', error '%s'"
                            % (json_request, e))

        return self.render()

config.update({
    'mongrel2_pair': (config[RECV_SPEC], config[SEND_SPEC]),
    'handler_tuples': [(r'^/request$', RequestHandler)] })

openscrape = Brubeck(**config)
openscrape.run()
