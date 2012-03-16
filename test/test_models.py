"""
Test caustic/models.py .
"""

from helpers import unittest
import bson
from server.app.models import User, InstructionDocument, InstructionField
from dictshield.base import ShieldException

class TestUser(unittest.TestCase):

    @property
    def requirements(self):
        return {
            'name': 'name',
            'email': 'user@email.com',
            'provider': 'provider'
        }

    def test_required_fields(self):
        """Should not validate without all of the requirements.
        """
        for req_name in self.requirements.viewkeys():
            test_req = self.requirements.copy()
            test_req.pop(req_name)
            with self.assertRaises(ShieldException):
                u = User(**test_req)
                u.validate()

    def test_valid_email(self):
        with self.assertRaises(ShieldException):
            u = User(**self.requirements)
            u.email = 'not an email address'
            u.validate()

    def test_valid_img(self):
        with self.assertRaises(ShieldException):
            u = User(**self.requirements)
            u.provider_img = 'not a url'
            u.validate()

    def test_valid_url(self):
        with self.assertRaises(ShieldException):
            u = User(**self.requirements)
            u.provider_url = 'not a url'
            u.validate()

    def test_validates(self):
        """Should validate with reqs
        """
        u = User(**self.requirements)
        u.validate()

    def test_not_deleted(self):
        """Should start out not deleted.
        """
        u = User(**self.requirements)
        self.assertFalse(u.deleted)

class TestInstructionDocument(unittest.TestCase):

    def setUp(self):
        self.cid = bson.objectid.ObjectId()

    def test_requires_name(self):
        """
        Needs a name.
        """
        doc = InstructionDocument(creator_id=self.cid,
                                  instruction={"load": "google.com"})
        with self.assertRaises(ShieldException):
            doc.validate()

    def test_requires_instruction(self):
        """
        Needs an instruction.
        """
        doc = InstructionDocument(creator_id=self.cid,
                                  name='name')
        with self.assertRaises(ShieldException):
            doc.validate()

    def test_requires_creator_id(self):
        """
        Needs a creator.
        """
        doc = InstructionDocument(instruction={"load": "google.com"},
                                  name='name')
        with self.assertRaises(ShieldException):
            doc.validate()

    def test_requires_valid_instruction(self):
        """
        Should not validate without valid instruction.
        """
        doc = InstructionDocument(creator_id=self.cid,name='name',
                                  instruction={"foo":"bar"})
        with self.assertRaises(ShieldException):
            doc.validate()

    def test_validates(self):
        """
        Should validate if there is a valid instruction and name.
        """
        doc = InstructionDocument(creator_id=self.cid,
                                  name='name',instruction={"load":"google.com"})
        doc.validate()

    def test_modify_instruction(self):
        """
        Dict in, dict out.
        """
        doc = InstructionDocument(creator_id=self.cid,
                                  name='name',instruction={"load":"google.com"})
        doc.instruction = {'load': 'nytimes.com'}
        doc.validate()
        self.assertEqual({'load':'nytimes.com'}, doc.instruction)

    def test_modify_tags(self):
        doc = InstructionDocument(creator_id=self.cid,
                                  name='name',
                                  tags=['foo'],
                                  instruction={"load":"google.com"})
        doc.tags = ['foo', 'bar', 'baz']
        doc.validate()
        self.assertEqual(['foo', 'bar', 'baz'], doc.tags)


class TestInstructionField(unittest.TestCase):

    def test_invalid(self):
        for invalid in [7,{'foo': 'bar'}]:
            with self.assertRaises(ShieldException):
                InstructionField().validate(invalid)

    def test_valid(self):
        for valid in ['foo', ['foo', 'bar'], {'load':'google.com'}, {'find':'.*'}]:
            InstructionField().validate(valid)
