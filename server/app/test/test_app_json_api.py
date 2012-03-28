import sys
from helpers import unittest
import requests
import json
from ConfigParser import SafeConfigParser

from ..src.database import get_db

PARSER = SafeConfigParser()

if len(PARSER.read('config/app.ini')):
    MAGIC_COOKIE = PARSER.get('test', 'magic_cookie')
    HOST = PARSER.get('test', 'host')
    PORT = PARSER.get('test', 'port')
    ROOT = "http://%s:%s" % (HOST, PORT)
    DB_HOST = PARSER.get('test', 'db_host')
    DB_PORT = PARSER.getint('test', 'db_port')
    DB_NAME= PARSER.get('test', 'db_name')
else:
    print("Test requires a config/app.ini file")
    sys.exit(1)

LOAD_GOOGLE = '{"load":"http://www.google.com/"}' # valid scraping instruction
TAGS = '["fun", "interesting", "enlightening"]'
VALID_INSTRUCTION = {
    'instruction': LOAD_GOOGLE,
    'tags': TAGS
}

class TestServerJSON(unittest.TestCase):
    """
    Test the server's JSON API.
    """

    def _login(self, user):
        """
        Login `user`.
        """
        self.s.cookies[MAGIC_COOKIE] = user

    def _logout(self):
        """
        Log out.
        """
        del self.s.cookies[MAGIC_COOKIE]

    def assertJsonEqual(self, str1, str2):
        """
        Assert two JSON strings are equivalent.
        """
        self.assertEqual(json.loads(str1), json.loads(str2))

    @classmethod
    def setUpClass(cls):
        """
        Make sure db is clean before starting up.
        """
        db = get_db(DB_HOST, DB_PORT, DB_NAME)
        db.connection.drop_database(db)

    def setUp(self):
        """
        Keep track of created accounts and session, make sure requests are for
        JSON.
        """
        self.created_accounts = []
        self.s = requests.session(headers={
            "accept": "application/json text/javascript"
        })

    def test_nonexistent(self):
        """
        Test getting a 404.
        """
        r = self.s.get("%s/instructions/lksdjflksdjg" % ROOT)
        self.assertEqual(404, r.status_code, r.content)

    def test_put_valid_instruction(self):
        """
        Create an instruction on the server using HTTP PUT.
        """
        self._login('fuller')
        r = self.s.put("%s/instructions/fuller/manhattan-bubble" % ROOT, data={
            'instruction': LOAD_GOOGLE,
            'tags': TAGS
        })
        self.assertEqual(201, r.status_code, r.content)

    def test_put_invalid_instruction(self):
        """
        Ensure the server rejects an invalid instruction.
        """
        self._login('chiang')
        r = self.s.put("%s/instructions/chiang/politics" % ROOT, data={
            'instruction': json.dumps({ 'foo':'bar' }),
            'tags': TAGS
        })
        self.assertEqual(400, r.status_code, r.content)

    def test_put_missing_argument(self):
        """
        Ensure the server rejects an instruction missing an argument.
        """
        self._login('chiang')
        r = self.s.put("%s/instructions/chiang/missing_tags" % ROOT, data={
            'instruction': LOAD_GOOGLE
        })
        self.assertEqual(400, r.status_code, r.content)
        r = self.s.put("%s/instructions/chiang/missing_instruction" % ROOT, data={
            'tags': TAGS
        })
        self.assertEqual(400, r.status_code, r.content)

    def test_not_logged_in_no_create(self):
        """
        Ensure the server rejects creating an instruction for a not logged
        in user.
        """
        r = self.s.put("%s/instructions/lennon/nope" % ROOT, data={
            'instruction': LOAD_GOOGLE,
            'tags': TAGS
        })
        self.assertEqual(403, r.status_code, r.content)

    def test_get_instruction_logged_in(self):
        """
        Get an instruction on the server using HTTP GET while logged in.
        """
        self._login('jacobs')
        self.s.put("%s/instructions/jacobs/life-n-death" % ROOT,
                   data=VALID_INSTRUCTION)

        r = self.s.get("%s/instructions/jacobs/life-n-death" % ROOT)
        self.assertEqual(200, r.status_code, r.content)
        self.assertJsonEqual(LOAD_GOOGLE, r.content)

    def test_get_instruction_not_logged_in(self):
        """
        Get a instruction on the server using HTTP GET while not logged in.
        """
        self._login('jacobs')
        self.s.put("%s/instructions/jacobs/life-n-death" % ROOT,
                   data=VALID_INSTRUCTION)
        self._logout()

        r = self.s.get("%s/instructions/jacobs/life-n-death" % ROOT)
        self.assertEqual(200, r.status_code, r.content)
        self.assertJsonEqual(LOAD_GOOGLE, r.content)

    def test_update_instruction_json(self):
        """
        Update an instruction by replacing it with PUT.
        """
        self._login('moses')
        self.s.put("%s/instructions/moses/bqe" % ROOT, data=VALID_INSTRUCTION)

        load_nytimes = json.dumps({"load":"http://www.nytimes.com/"})
        self.s.put("%s/instructions/moses/bqe" % ROOT, data={
            'instruction': load_nytimes,
            'tags': TAGS
        })

        r = self.s.get("%s/instructions/moses/bqe" % ROOT)
        self.assertEqual(200, r.status_code, r.content)
        self.assertJsonEqual(load_nytimes, r.content)

    def test_user_instructions(self):
        """
        Get all the instructions by a particular user.
        """
        self._login('joe')
        self.s.put("%s/instructions/joe/foo" % ROOT, data=VALID_INSTRUCTION)
        self.s.put("%s/instructions/joe/bar" % ROOT, data=VALID_INSTRUCTION)

        r = self.s.get("%s/instructions/joe/" % ROOT)
        self.assertEqual(200, r.status_code, r.content)
        self.assertItemsEqual(['/instructions/joe/foo',
                               '/instructions/joe/bar'],
                              json.loads(r.content))

    def test_get_instructions_by_tag(self):
        """
        Get several instructions with one tag.  Returns an array of
        links to the instructions.
        """
        self._login('trog-dor')
        self.s.put("%s/instructions/trog-dor/pillaging" % ROOT, data={
            'instruction': LOAD_GOOGLE,
            'tags': '["burnination"]'
        })
        self.s.put("%s/instructions/trog-dor/burning" % ROOT, data={
            'instruction': LOAD_GOOGLE,
            'tags': '["burnination"]'
        })

        r = self.s.get("%s/instructions/trog-dor/burnination/" % ROOT)
        self.assertEqual(200, r.status_code, r.content)
        self.assertItemsEqual(["/instructions/trog-dor/burning",
                               "/instructions/trog-dor/pillaging"],
                              json.loads(r.content))

    def test_get_nonexistent_tag(self):
        """
        Get instructions for nonexistent tag.  Returns an empty array.
        """
        self._login('vicious')
        self._logout()

        r = self.s.get("%s/instructions/vicious/erudite/" % ROOT)
        self.assertEqual(200, r.status_code, r.content)
        self.assertEqual([], json.loads(r.content))

    def test_delete_tag(self):
        """
        Delete a tag.
        """
        self._login('fashionista')
        self.s.put("%s/instructions/fashionista/ray-bans/" % ROOT, data={
            'instruction': LOAD_GOOGLE,
            'tags' : '["trendy"]'
        })
        self.s.put("%s/instructions/fashionista/ray-bans/" % ROOT, data={
            'instruction': LOAD_GOOGLE,
            'tags' : '[]'
        })

        r = self.s.get("%s/instructions/fashionista/trendy/" % ROOT)
        self.assertEqual(200, r.status_code, r.content)
        self.assertJsonEqual('[]', r.content)

    def xtest_clone_instruction(self):
        """
        One user clones another user's instruction.  Should keep JSON and tags.

        TODO: keep tags?
        """
        self._login('muddy')
        self.s.put("%s/instructions/muddy/delta-blues" % ROOT, data={
            'instruction': LOAD_GOOGLE,
            'tags': "['guitar']"
        })
        self._logout()

        self._login('crapton')
        r = self.s.post("%s/instructions/crapton" % ROOT, data={
            'clone': '/instructions/muddy/delta-blues'
        })
        self.assertEqual(201, r.status_code)
        self.assertEqual('/instructions/crapton/delta-blues', r.headers['Location'])

        r = self.s.get("%s/instructions/crapton/delta-blues" % ROOT)
        self.assertEqual(200, r.status_code)
        self.assertJsonEqual(LOAD_GOOGLE, r.content)

        r = self.s.get("%s/instructions/crapton/guitar/" % ROOT)
        self.assertEqual(200, r.status_code)
        self.assertEqual(["/instructions/crapton/delta-blues"], json.loads(r.content))

    def xtest_pull_instruction(self):
        """
        One user pulls another user's instruction after cloning it.
        Should replace the current instruction json with that of the
        pulled instruction.
        """
        self._login('barrett')
        data = json.dumps('{"load":"http://www.saucerful.com/"}')
        self.s.put("%s/instructions/barrett/saucerful" % ROOT, data={
            'instruction': data,
            'tags': "[]"
        })
        self._logout()

        self._login('gilmour')
        self.s.post("%s/instructions/gilmour/" % ROOT, {
            'clone': '/instructions/barret/saucerful'
        })
        self._logout()

        self._login('barrett')
        data = json.dumps('{"load":"http://www.jugband.com/"}')
        self.s.put("%s/instructions/barrett/saucerful" % ROOT, data={
            'instruction': data,
            'tags': "[]"
        })
        self._logout()

        self._login('gilmour')
        r = self.s.post("%s/instructions/gilmour/saucerful" % ROOT, data={
            'pull': '/instructions/barret/saucerful' 
        })
        self.assertEqual(204, r.status_code)
        r = self.s.get("%s/instructions/gilmour/saucerful" % ROOT)
        self.assertEqual(200, r.status_code)
        self.assertJsonEqual('{"load":"http://www.jugband.com/"}', r.content)
