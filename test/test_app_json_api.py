import sys
from helpers import unittest
import requests
import json
from ConfigParser import SafeConfigParser

from server.app.database import get_db

PARSER = SafeConfigParser()

if len(PARSER.read('config/app.ini')):
    HOST = PARSER.get('test', 'test_host')
    PORT = PARSER.get('test', 'test_port')
    ROOT = HOST + ':' + PORT
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

    def _signup(self, user):
        """
        Sign up `user`, while keeping track of the signup for later cleanup.
        """
        r = self.s.post("%s/instructions/" % ROOT, data={
            'action': 'signup',
            'user'  : user
        })
        if r.status_code == 200:
            self.created_accounts.append(user)
        return r

    def _login(self, user):
        """
        Login `user`.
        """
        r = self.s.post("%s/instructions/" % ROOT, data={
            'action': 'login',
            'user'  : user
        })
        self.assertEqual(200, r.status_code, r.content)
        return r

    def _logout(self):
        """
        Log out.
        """
        r = self.s.post("%s/instructions/" % ROOT, data={
            'action': 'logout'
        })
        self.assertEqual(200, r.status_code, r.content)
        return r

    def _destroy(self, user):
        """
        Destroy `user`.  Should already be logged in.
        """
        r = self.s.delete("%s/instructions/%s" % (ROOT, user))
        self.assertEqual(200, r.status_code, r.content)
        self.assertIn('destroyed', json.loads(r.content), r.content)
        if user in self.created_accounts:
            self.created_accounts.remove(user)
        return r

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
        db = get_db('localhost', 27017, 'openscrape_test') # todo read from config
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

    def tearDown(self):
        """
        Destroy any created accounts.
        """
        for user in self.created_accounts:
            self._logout()
            self._login(user)
            self._destroy(user)

    def test_valid_user_names(self):
        """
        Names with dashes are allowed.
        """
        for valid in ['dashy-mcdash', 'simple']:
            r = self._signup(valid)
            self.assertEqual(200, r.status_code, r.content)
            self.assertIn('session', self.s.cookies, r.content)
            self._logout()

    def test_invalid_user_names(self):
        """
        Names with non-alphanumerics or non-dashes are not allowed
        """
        for invalid in ['space mcspace', '*&(*EYF', 'slash/mcslash/']:
            r = self._signup(invalid)
            self.assertEqual(400, r.status_code, r.content)
            self.assertNotIn('session', self.s.cookies, r.content)

    def test_login(self):
        """
        Test logging in.
        """
        self._signup('mies')
        self._logout()
        self._login('mies')
        self.assertIn('session', self.s.cookies)

    def test_logout(self):
        """
        Test logging out.
        """
        self._signup('vitruvius')
        self._logout()
        self.assertIn('session', self.s.cookies)

    def test_signup(self):
        """
        Test creating an account.
        """
        r = self._signup('wootage')
        self.assertEquals(200, r.status_code, r.content)
        self.assertTrue('session' in self.s.cookies)
        r = self.s.get("%s/instructions/%s" % (ROOT, 'wootage'))
        self.assertEquals(200, r.status_code, r.content)

    def test_destroy(self):
        """
        Test destroying an account.
        """
        self._signup('doomed')
        r = self._destroy('doomed')
        self.assertEquals(200, r.status_code, r.content)
        r = self.s.get("%s/instructions/%s" % (ROOT, 'doomed'))
        self.assertEquals(404, r.status_code, r.content)

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
        self._signup('fuller')
        r = self.s.put("%s/instructions/fuller/manhattan-bubble" % ROOT, data={
            'instruction': LOAD_GOOGLE,
            'tags': TAGS
        })
        self.assertEqual(201, r.status_code, r.content)

    def test_put_invalid_instruction(self):
        """
        Ensure the server rejects an invalid instruction.
        """
        self._signup('chiang')
        r = self.s.put("%s/instructions/chiang/politics" % ROOT, data={
            'instruction': json.dumps({ 'foo':'bar' }),
            'tags': TAGS
        })
        self.assertEqual(400, r.status_code, r.content)

    def test_put_missing_argument(self):
        """
        Ensure the server rejects an instructio missing an argument.
        """
        self._signup('chiang')
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
        self._signup('lennon')
        self._logout()
        r = self.s.put("%s/instructions/lennon/nope" % ROOT, data={
            'instruction': LOAD_GOOGLE,
            'tags': TAGS
        })
        self.assertEqual(403, r.status_code, r.content)

    def test_get_instruction_logged_in(self):
        """
        Get an instruction on the server using HTTP GET while logged in.
        """
        self._signup('jacobs')
        self.s.put("%s/instructions/jacobs/life-n-death" % ROOT,
                   data=VALID_INSTRUCTION)

        r = self.s.get("%s/instructions/jacobs/life-n-death" % ROOT)
        self.assertEqual(200, r.status_code, r.content)
        self.assertJsonEqual(LOAD_GOOGLE, r.content)

    def test_get_instruction_not_logged_in(self):
        """
        Get a instruction on the server using HTTP GET while not logged in.
        """
        self._signup('jacobs')
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
        self._signup('moses')
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
        self._signup('joe')
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
        self._signup('trog-dor')
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
        self._signup('vicious')
        self._logout()

        r = self.s.get("%s/instructions/vicious/erudite/" % ROOT)
        self.assertEqual(200, r.status_code, r.content)
        self.assertEqual([], json.loads(r.content))

    def test_delete_tag(self):
        """
        Delete a tag.
        """
        self._signup('fashionista')
        print "ROOT: %s" % ROOT
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
        self._signup('muddy')
        self.s.put("%s/instructions/muddy/delta-blues" % ROOT, data={
            'instruction': LOAD_GOOGLE,
            'tags': "['guitar']"
        })
        self._logout()

        self._signup('crapton')
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
        self._signup('barrett')
        data = json.dumps('{"load":"http://www.saucerful.com/"}')
        self.s.put("%s/instructions/barrett/saucerful" % ROOT, data={
            'instruction': data,
            'tags': "[]"
        })
        self._logout()

        self._signup('gilmour')
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
