from helpers import unittest
import requests
import json

from ..src import config

URL = "%s://%s:%s/proxy" % (config.SCHEME, config.HOST, config.PORT)

class TestProxyIntegration(unittest.TestCase):
    """
    Integration tests that shoot real requests at the HTTP proxy, expecting
    real responses in turn.
    """

    def test_huge_request(self):
        """Should reject dangerously large requests.  The request itself is
        technically valid.
        """
        huge_req = {
            'instruction': {
                'load': "{{%s}}" % 'a'.join('' for i in xrange(10000))
            },
            'id': 'foo',
            'tags': {'foo': 'bar'},
            'force': True
        }
        r = requests.post(URL, data=json.dumps(huge_req))
        self.assertEquals(413, r.status_code, msg=r.content)
        self.assertRegexpMatches(r.content, '(?i)too big')

    def test_bad_json(self):
        """Should return 400 if the request is simply formatted wrong.
        """
        not_json = ["bare string", '{"foo","bar"}', '["foo", "bar"']
        for bad in not_json:
            r = requests.post(URL, data=json.dumps(bad))
            self.assertEquals(400, r.status_code)
            self.assertRegexpMatches(r.content, '(?i)caustic proxy error',
                                     msg=r.content)

    def test_remote_to_local(self):
        """Should not be able to access arbitrary files on server.
        """
        violations = [
            { 'id': 'baz', 'uri': './', 'instruction': 'start.sh' },
            { 'id': 'foo', 'instruction': {"extends": "file://foo/bar/baz" }},
            { 'id': 'bar', 'uri': '/dev/null', 'instruction': {"extends": "file://foo/bar/baz" }} ]

        for v in violations:
            r = requests.post(URL, data=json.dumps(v))
            self.assertEquals(200, r.status_code)
            response = json.loads(r.content)
            self.assertEqual('failed', response['status'])
            self.assertRegexpMatches(response['failed'], '(?i)scheme .* not supported')

    def test_invalid_instruction(self):
        """Should return 400 if the instruction is invalid
        """
        #bad_instructions
        pass

    def test_request_simple_google(self):
        """Standard google request.
        """
        pass
