
"""
Openscrape proxy to caustic server.

This communicates with a Caustic ZMQ server via IPC.
"""

import zmq
# import time
import logging
try:
    import simplejson as json
    json
except ImportError:
    import json
from brubeck.request_handling import Brubeck, WebMessageHandler
import config


CONTEXT = zmq.Context.instance()
ORIGIN = "%s://%s:%s/" % (config.SCHEME, config.HOST, config.PORT)

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

    def set_body_errors(self, errors):
        """
        Set the body of the response to proper format for JSON errors.
        """
        self.set_body(json.dumps([{
            'name': 'Caustic Proxy Error',
            'description': e }
            for e in errors
        ]))

    def post(self):
        """
        Takes a single POSTed request as JSON, passes it on
        the wire to the ZMQ caustic backend, then returns the response when
        it is ready.
        """

        json_request = self.message.body
        self.headers['Content-Type'] = 'application/json'

        if len(json_request) > config.MAX_REQUEST_LENGTH:
            self.set_body('Request is too big')
            self.set_status(413, status_msg='Request is too big')
            return self.render()

        try:
            request = json.loads(json_request)
        except ValueError as e:
            self.set_body_errors(['Not JSON'])
            self.set_status(415, status_msg='Not JSON')
            return self.render()
        else:
            if not isinstance(request, dict):
                self.set_body_errors(['Request must be a JSON object'])
                self.set_status(415, status_msg='Not JSON Object')
                return self.render()

            # if URI is unspecified, set it to the same as the proxy
            if 'uri' not in request:
                request['uri'] = ORIGIN
                json_request = json.dumps(request)

            # limited = self.is_limited()
            limited = False  # TODO
            if limited:
                self.set_status( 400, status_msg="Too many requests")
                self.set_body_errors(['Too many requests'])
                return self.render()

            # connect to backend
            try:
                sock = CONTEXT.socket(zmq.REQ)
                sock.connect(config.BACKEND_URI)
                sock.send(json_request)

                resp = sock.recv()
            except Exception as e:
                logging.error(str(e))
                self.set_status(500, status_msg='Error handling request')
                self.set_body_errors(['Error handling request'])
            else:

                # if the response is a JS object, send it along as a 200
                if resp[0] == '{':
                    self.set_body(resp)
                # otherwise, it's an error
                else:
                    self.set_body_errors([resp])
                    self.set_status(400, status_msg='Caustic proxy error')

            return self.render()

openscrape = Brubeck(**{
    'mongrel2_pair': (config.RECV_SPEC, config.SEND_SPEC),
    'cookie_secret': config.COOKIE_SECRET,
    'handler_tuples': [(r'^/proxy$', RequestHandler)]
})

openscrape.run()
