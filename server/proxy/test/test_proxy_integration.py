from helpers import unittest
import requests
import json

from ..src import config

ORIGIN = "%s://%s:%s/" % (config.SCHEME, config.HOST, config.PORT)
URL = "%sproxy" % ORIGIN

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
        """Should return 415 if the request entity is simply not JSON.
        """
        not_json = ["bare string", '{"foo","bar"}', '["foo", "bar"']
        for bad in not_json:
            r = requests.post(URL, data=bad)
            self.assertEquals(415, r.status_code)
            self.assertRegexpMatches(r.content, '(?i)not json',
                                     msg=r.content)

    def test_local(self):
        """Should not be able to cross from remote to local.
        """
        violations = [
            { 'id': 'baz', 'uri': './', 'instruction': 'start.sh' },
            { 'id': 'bar', 'uri': '/dev/null', 'instruction': {"extends": "file://foo/bar/baz" }} ]

        for v in violations:
            r = requests.post(URL, data=json.dumps(v))
            self.assertEquals(200, r.status_code)
            response = json.loads(r.content)
            self.assertEqual('failed', response['status'])
            self.assertRegexpMatches(response['failed'], '(?i)scheme .* not supported')


    def test_remote_to_local(self):
        """Should not be able to access arbitrary files on server.
        """
        violations = [
            { 'id': 'foo', 'instruction': {"extends": "file://foo/bar/baz" }}]

        for v in violations:
            r = requests.post(URL, data=json.dumps(v))
            self.assertEquals(200, r.status_code)
            response = json.loads(r.content)
            self.assertEqual('failed', response['status'])
            self.assertRegexpMatches(response['failed'], '(?i)would cross from remote to local')

    def test_requires_id(self):
        """Rejects request without an id.
        """
        r = requests.post(URL, data=json.dumps({'instruction': 'foo'}))
        self.assertEquals(400, r.status_code)
        self.assertRegexpMatches(r.content, '(?i)id.* not found')

    def test_echoes_id(self):
        """Returns same ID as sent.
        """
        r = requests.post(URL, data=json.dumps({'id': 'foo', 'instruction': 'bar'}))
        self.assertEquals(json.loads(r.content)['id'], 'foo')

    def test_default_uri(self):
        """Should default the request URI to the same as the proxy.
        """
        r = requests.post(URL, data=json.dumps({'id': 0, 'instruction':'foo'}))
        self.assertEquals(200, r.status_code)
        resp = json.loads(r.content)
        self.assertIn('uri', resp)
        self.assertEquals(ORIGIN, resp['uri'])

    def test_invalid_instruction(self):
        """Should return a failed if the instruction is invalid
        """
        invalid = {
            'id': 'foo',
            'instruction': {
                'load': 'http://www.google.com',
                'find': 'foo'
            }
        }
        r = requests.post(URL, data=json.dumps(invalid))
        self.assertEqual(200, r.status_code)
        response = json.loads(r.content)
        self.assertEqual('failed', response['status'])
        self.assertRegexpMatches(response['failed'], '(?i)cannot define both')

    def test_request_simple_google(self):
        """Standard google request.
        """
        request = {
            'id': 'foo',
            'force': True,
            'instruction': {
                'load': 'http://www.google.com/search?q=foo',
                'then': {
                    'name': 'after foo',
                    'find': 'foo(.*)',
                    'replace': '$1'
                }
            }
        }
        r = requests.post(URL, data=json.dumps(request))
        self.assertEquals(200, r.status_code)
        response = json.loads(r.content)
        #print(response)
