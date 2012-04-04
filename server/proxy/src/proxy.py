
"""
Openscrape proxy to caustic server.

This communicates with a Caustic ZMQ server via IPC.
"""

import uuid
import zmq
import sys
# import time
from ConfigParser import SafeConfigParser
from brubeck.request_handling import Brubeck, WebMessageHandler

###
#
# CONFIG
#
###
if len(sys.argv) != 3:
    print """
Openscrape proxy must be invoked with a two arguments:

python server/proxy/proxy.py <MODE> <URI>

    MODE which mode from `config/proxy.ini` to use: Look at `config/proxy.ini`
         for defined modes. Defaults are `production`, `staging`, and `test`.
    URI  the URI of the socket used to communicate with the jar via IPC.
"""
    exit(1)

MODE = sys.argv[1]
BACKEND_URI = sys.argv[2]
PARSER = SafeConfigParser(dict(
    mode = MODE,
    recv_spec = 'ipc://openscrape_proxy:1',
    send_spec = 'ipc://openscrape_proxy:0',
    reqs_per_hour = '60'
))

if not len(PARSER.read('config/proxy.ini')):
    print "No config/proxy.ini file found in this directory.  Writing a config..."

    for mode in ['production', 'staging', 'test']:
        PARSER.add_section(mode)
        PARSER.set(mode, 'cookie_secret', str(uuid.uuid4()))

    try:
        conf = open('config/proxy.ini', 'w')
        PARSER.write(conf)
        conf.close()
    except IOError:
        print "Could not write config file to `config/proxy.ini`, exiting..."
        exit(1)

RECV_SPEC = PARSER.get(MODE, 'recv_spec')
SEND_SPEC = PARSER.get(MODE, 'send_spec')
REQS_PER_HOUR = PARSER.getint(MODE, 'reqs_per_hour')
COOKIE_SECRET = PARSER.get(MODE, 'cookie_secret')

CONTEXT = zmq.Context.instance()


class RequestHandler(WebMessageHandler):
    # def is_limited(cookie):
    #     """
    #     Check whether the user is limited from making too many requests.
    #     Returns True if they are, False otherwise.
    #     """
    #     cookie = self.get_cookie('session',
    #                              '0/%s' % time.time(),
    #                              self.application.cookie_secret)
    #     try:
    #         reqs_per_hour, last_time = [float(val) for val in cookie.split('/')]
    #     except ValueError:
    #         self.delete_cookie()
    #         return False

    def post(self):
        """
        Takes a single POSTed request as JSON, passes it on
        the wire to the ZMQ caustic backend, then returns the response when
        it is ready.
        """

        json_request = self.message.body
        try:
            # limited = self.is_limited()
            limited = False  # TODO
            if limited:
                self.set_status(
                    400,
                    status_msg="You have made too many requests, switch to the applet or wait a bit.")
            else:
                # connect to backend
                sock = CONTEXT.socket(zmq.REQ)
                sock.connect(BACKEND_URI)
                sock.send(json_request)

                resp = sock.recv()
                self.headers['Content-Type'] = 'application/json'

                self.set_body(resp)
        except Exception as e:
            self.set_status(400,
                            status_msg="Invalid JSON Request: '%s', error '%s'"
                            % (json_request, e))

        return self.render()

config = {
    'mongrel2_pair': (RECV_SPEC, SEND_SPEC),
    'cookie_secret': COOKIE_SECRET,
    'handler_tuples': [(r'^/proxy$', RequestHandler)] }

openscrape = Brubeck(**config)
openscrape.run()
