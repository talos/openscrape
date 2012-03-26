"""
Test the database.  Mongod must be running.
"""

from helpers import unittest
import shutil
import jsongit
import pymongo
import ConfigParser
import warnings
import sys

import server.app.database as database
import server.app.models as models

config = ConfigParser.SafeConfigParser()
if len(config.read('config/app.ini')):
    try:
        db = database.get_db(config.get('test', 'db_host'),
                             config.getint('test', 'db_port'),
                             config.get('test', 'db_name'))
    except ConfigParser.NoOptionError as e:
        warnings.warn("Missing required option for test: %s" % e)
        sys.exit(1)
    except pymongo.errors.AutoReconnect as e:
        warnings.warn("Could not connect to mongo.  Is it running? %s" % e)
        sys.exit(1)
else:
    warnings.warn("No config at conf/app.ini, cannot run test_database.py")
    sys.exit(1)

REPO_DIR = 'tmp_git'
INSTRUCTION = {'load':'google'}  # valid instruction for convenience
TAGS = ['useful', 'fun', 'interesting']

def new_user(**kwargs):
    """
    Generates a new (by default) valid user each time it is called.
    """
    defaults = {
        'name': 'name',
        'email': 'user@email.com',
        'provider': 'provider',
        'provider_id' : '1234',
        'provider_img': 'http://foo.com/img.jpg',
        'provider_url': 'http://foo.com/name',
        'provider_name': 'some-other-name'
    }
    defaults.update(kwargs)
    return models.User(**defaults)

class TestUsers(unittest.TestCase):

    def setUp(self):
        self.users = database.Users(db)

    def tearDown(self):
        for name in set(db.collection_names()) - set([u'system.indexes']):
            db[name].drop()

    def test_new_user_assigns_id(self):
        """Saving a user should assign an id.
        """
        u = new_user()
        self.assertNotIn('id', u)
        self.users.save_or_create(u)
        self.assertIn('id', u)

    def test_get_user_by_id(self):
        """Get a user by the assigned id.
        """
        u = new_user()
        self.users.save_or_create(u)
        self.assertEquals(u.to_python(), self.users.get(u.id).to_python())

    def test_find_user_by_name(self):
        """Find a user by name
        """
        u = new_user(name='joe')
        self.users.save_or_create(u)
        self.assertEquals(u.to_python(), self.users.find('joe').to_python())

    def test_find_user_by_email(self):
        """Find user by email
        """
        u = new_user(email='foo@bar.com')
        self.users.save_or_create(u)
        self.assertEquals(u.to_python(), self.users.find('foo@bar.com').to_python())

    def test_find_no_user_name(self):
        """Not finding nonexistent user name.
        """
        u = new_user(name='exists')
        self.users.save_or_create(u)
        self.assertIsNone(self.users.find('nonexistent'))

    def test_find_no_user_email(self):
        """Not finding nonexistent email.
        """
        u = new_user(email='roses@red.com')
        self.users.save_or_create(u)
        self.assertIsNone(self.users.find('violets@blue.com'))

    def test_no_duplicate_names(self):
        """Cannot create two users with same name but different emails.
        """
        sally1 = new_user(name='sally', email="sally@foo.com")
        sally2 = new_user(name='sally', email="sally@bar.com")
        self.users.save_or_create(sally1)
        with self.assertRaises(database.DuplicateError):
            self.users.save_or_create(sally2)

    def test_no_duplicate_email(self):
        """Cannot create two users with same email but different names.
        """
        cindy1 = new_user(email='cindy@sherman.com', name="artist")
        cindy2 = new_user(email='cindy@sherman.com', name="photographer")
        self.users.save_or_create(cindy1)
        with self.assertRaises(database.DuplicateError):
            self.users.save_or_create(cindy2)

    def test_several_users(self):
        """Should be able to add several users.
        """
        users = [
            new_user(name='kelly', email="from@justin.com"),
            new_user(name='justin', email="to@kelly.com"),
            new_user(name='abdul', email='paula@abdul.net')
        ]
        for user in users:
            self.users.save_or_create(user)
        for user in users:
            self.assertEquals(user.to_python(), self.users.get(user.id).to_python(),
                              'get %s by id' % user)
            self.assertEquals(user.to_python(), self.users.find(user.name).to_python(),
                              'find %s by name' % user)
            self.assertEquals(user.to_python(), self.users.find(user.email).to_python(),
                              'find %s by email' % user)

    def test_delete_user(self):
        """Cannot find user by ID or name after being deleted.
        """
        george = new_user(name='george', email='george@curious.com')
        self.users.save_or_create(george)
        self.users.delete(george)
        self.assertIsNone(self.users.get(george.id))
        self.assertIsNone(self.users.find('george'))
        self.assertIsNone(self.users.find('george@curious.com'))


class TestInstructions(unittest.TestCase):

    def setUp(self):
        repo = jsongit.init(REPO_DIR)
        self.users = database.Users(db)
        self.creator = new_user(name='creator')
        self.users.save_or_create(self.creator)
        self.instructions = database.Instructions(self.users, repo, db)

    def tearDown(self):
        for name in set(db.collection_names()) - set([u'system.indexes']):
            db[name].drop()
        shutil.rmtree(REPO_DIR)

    def test_create_instruction(self):
        """Creating an instruction.
        """
        doc = self.instructions.save_or_create(self.creator, 'google', INSTRUCTION, TAGS)
        self.assertIsNotNone(doc)
        self.assertEquals('google', doc.name)
        self.assertEquals(INSTRUCTION, doc.instruction)
        self.assertEquals(TAGS, doc.tags)
        doc.validate()

    def test_duplicate_names_ok(self):
        """Duplicate names are OK provided the creators are different.
        """
        joe = new_user(name='joe', email='joe@bob.com')
        bobo = new_user(name='bobo', email='bobo@clown.com')
        self.users.save_or_create(joe)
        self.users.save_or_create(bobo)

        self.instructions.save_or_create(joe, 'name', INSTRUCTION, TAGS)
        self.instructions.save_or_create(bobo, 'name', INSTRUCTION, TAGS)

    def test_find_instruction(self):
        """Find an instruction.
        """
        self.instructions.save_or_create(self.creator, 'google', INSTRUCTION, TAGS)
        doc = self.instructions.find(self.creator.name, 'google')
        self.assertEqual('google', doc.name)
        self.assertEqual(INSTRUCTION, doc.instruction)

    def test_find_creator_instructions(self):
        """Find instructions created by a name.
        """
        self.instructions.save_or_create(self.creator, 'foo', INSTRUCTION, TAGS)
        self.instructions.save_or_create(self.creator, 'bar', INSTRUCTION, TAGS)
        self.instructions.save_or_create(self.creator, 'baz', INSTRUCTION, TAGS)
        docs = self.instructions.for_creator(self.creator.name)
        self.assertEqual(3, len(docs))
        self.assertItemsEqual(['foo', 'bar', 'baz'], [d.name for d in docs])

    def test_save_instruction_tags(self):
        """Update the tags in an instruction.
        """
        doc = self.instructions.save_or_create(self.creator, 'foo', INSTRUCTION, TAGS)
        doc.tags = ['bar', 'baz']
        self.instructions.save_or_create(self.creator, doc.name, doc.instruction, doc.tags)

    def test_bad_instruction(self):
        """Don't update bad instruction.
        """
        self.instructions.save_or_create(self.creator, 'foo', INSTRUCTION, TAGS)
        for bad in [{'foo':'bar'}, 7]:
            with self.assertRaises(database.ValidationError):
                self.instructions.save_or_create(self.creator, 'foo', bad, TAGS)

    def test_valid_instructions(self):
        """Instructions come in all shapes & sizes.
        """
        doc = self.instructions.save_or_create(self.creator, 'foo', INSTRUCTION, TAGS)
        for valid in ['bare string', ['some', 'array'], {'load':'google'}]:
            self.instructions.save_or_create(self.creator, doc.name,
                                             doc.instruction, doc.tags)

    def test_bad_tags(self):
        """Don't create with bad tags.
        """
        for bad in [7, 'string', {}]:
            with self.assertRaises(database.ValidationError):
                self.instructions.save_or_create(self.creator, 'foo', INSTRUCTION, bad)

    def test_tagged_instructions(self):
        """ Get instructions by their tag.
        """
        roses = self.instructions.save_or_create(self.creator, 'roses', INSTRUCTION, TAGS)
        violets = self.instructions.save_or_create(self.creator, 'violets', INSTRUCTION, TAGS)
        lilacs = self.instructions.save_or_create(self.creator, 'lilacs', INSTRUCTION, TAGS)

        roses.tags = ['red', 'white']
        violets.tags = ['blue', 'purple']
        lilacs.tags = ['purple', 'white']

        for doc in [roses, violets, lilacs]:
            self.instructions.save_or_create(self.creator, doc.name, doc.instruction, doc.tags)

        whites = self.instructions.tagged(self.creator.name, 'white')
        self.assertEqual(2, len(whites))
        self.assertItemsEqual(['roses', 'lilacs'], [d.name for d in whites])

    def test_no_user_none_tags(self):
        """Should return none if no user.
        """
        self.assertIsNone(self.instructions.tagged('some dude', 'tag'))

    def test_user_empty_array_tags(self):
        """Should return empty array if there is a user, but no tags.
        """
        self.assertEquals([], self.instructions.tagged(self.creator.name, 'tag'))

    def test_delete(self):
        """Deleting eliminates, allows creation of new with same name.
        """
        doomed = self.instructions.save_or_create(self.creator, 'doomed', INSTRUCTION, TAGS)
        self.assertTrue(self.instructions.delete(doomed))
        self.assertFalse(self.instructions.delete(doomed))
        self.instructions.save_or_create(self.creator, 'doomed', INSTRUCTION, TAGS)

    def test_create(self):
        """Can create with save_or_create
        """
        self.instructions.save_or_create(self.creator, 'created', INSTRUCTION, TAGS)
        self.assertIsNotNone(self.instructions.find(self.creator.name, 'created'))

    def test_save(self):
        """Can save with save_or_create
        """
        self.instructions.save_or_create(self.creator, 'saved', INSTRUCTION, TAGS)
        self.instructions.save_or_create(
            self.creator, 'saved', {'load': 'something else'}, ['foo'])
        doc = self.instructions.find(self.creator.name, 'saved')
        self.assertEqual({'load': 'something else'}, doc.instruction)
        self.assertEqual(['foo'], doc.tags)

    def test_retrieve_fields(self):
        """Get out what we put in
        """
        self.instructions.save_or_create(self.creator, 'retrieve', INSTRUCTION, TAGS)
        doc = self.instructions.find(self.creator.name, 'retrieve')
        self.assertEqual(INSTRUCTION, doc.instruction)
        self.assertEqual(TAGS, doc.tags)

    def test_save_and_retrieve_instruction(self):
        """Should be able to edit instruction, persist it, and retrieve it.
        """
        self.instructions.save_or_create(self.creator, 'retrieve',
                                         INSTRUCTION, TAGS)
        self.instructions.save_or_create(self.creator, 'retrieve',
                                         {'load': 'nytimes.com'}, TAGS)
        retrieved = self.instructions.find(self.creator.name, 'retrieve')
        self.assertEqual({'load': 'nytimes.com'}, retrieved.instruction)

    def test_save_or_create_and_retrieve_instruction(self):
        """Should be able to edit instruction, persist it, and retrieve it.
        All using save_or_create instead of create or save.
        """
        self.instructions.save_or_create(self.creator, 'retrieve', INSTRUCTION, TAGS)
        doc = self.instructions.find(self.creator.name, 'retrieve')
        retrieved = self.instructions.save_or_create(self.creator,
                                                     'retrieve',
                                                     {'load': 'nytimes.com'}, doc.tags)
        self.assertEqual({'load': 'nytimes.com'}, retrieved.instruction)

