# -*- coding: utf-8 -*-

"""
caustic.database
"""

import pymongo
from pymongo.errors import DuplicateKeyError
from jsongit import signature
from models import User, InstructionDocument
from dictshield.base import ShieldException

def get_db(server, port, name):
    db = pymongo.Connection(server, port)[name]
    db.safe = True
    return db


class Users(object):
    """Collection of users.  Ensures uniqueness of non-deleted
    names.
    """

    def __init__(self, db):
        self.coll = db.users
        self.coll.ensure_index('name', unique=True)
        self.deleted = db.deleted_users

    def create(self, name):
        """Create a new user.

        Returns the User, or None if the user has a duplicate name.
        """
        try:
            id = self.coll.insert(User(name=name).to_python())
            return self.get(id)
        except DuplicateKeyError:
            return None

    def get(self, id):
        """Get a user by id.

        Returns the User or None.
        """
        u = self.coll.find_one(id)
        return User(**u) if u else None

    def find(self, name):
        """Get a user by name.

        Returns the User or None.
        """
        u = self.coll.find_one({'name': name})
        return User(**u) if u else None

    def delete(self, user):
        """Delete a user.
        """
        self.coll.remove(user.id)
        self.deleted.save(user.to_python())


class Instructions(object):
    """Collection of instructions.  Ensures uniquenss of
    creator_id and name.  Keeps git repo fresh.
    """

    def __init__(self, users, repo, db):
        self.repo = repo
        self.users = users
        self.coll = db.instructions
        self.coll.ensure_index([('creator_id', pymongo.ASCENDING),
                                ('name', pymongo.ASCENDING)],
                               unique=True)

    def _repo_key(self, creator, instruction):
        """The key for the repo.
        """
        return '/'.join([str(creator.id), str(instruction.id)])

    def for_creator(self, creator_name):
        """Find all instructions by a creator.

        Returns an array of InstructionDocuments, or None if
        the creator_name does not exist.
        """
        u = self.users.find(creator_name)
        if u:
            cursor = self.coll.find({'creator_id': u.id})
            return [InstructionDocument(**i) for i in cursor]
        else:
            return None

    def find(self, creator_name, name):
        """Find an instruction by creator name and its own name.

        Returns the InstructionDocument or None.
        """
        u = self.users.find(creator_name)
        if u:
            i = self.coll.find_one({'creator_id': u.id, 'name': name})
            return InstructionDocument(**i) if i else None
        else:
            return None

    def tagged(self, creator_name, tag):
        """Find instructions by creator name and tag.

        Returns a list of InstructionDocuments, or None if
        the creator doesn't exist.
        """
        u = self.users.find(creator_name)
        if u:
            cursor = self.coll.find({'creator_id': u.id, 'tags': tag})
            return [InstructionDocument(**i) for i in cursor]
        else:
            return None

    def create(self, creator, name, instruction, tags):
        """Create an instruction for a creator.

        Returns the InstructionDocument.

        Raises a DuplicateKeyError or ShieldException otherwise.
        """
        doc = InstructionDocument(
            creator_id=creator.id,
            name=name,
            instruction=instruction,
            tags=tags)
        doc.validate()

        id = self.coll.insert(doc.to_python())
        doc = InstructionDocument(**self.coll.find_one(id))  # grab ID
        self.repo.create(self._repo_key(creator, doc), doc.instruction,
                         author=signature(creator.name, creator.name))
        return doc

    def save_or_create(self, creator, name, instruction, tags):
        """Save over the named instruction with new data if it exists,
        or create it otherwise.

        Returns the InstructionDocument.

        Raises a ShieldException if there's a problem.
        """
        doc = self.find(creator.name, name)
        if doc:
            doc.instruction = instruction
            doc.tags = tags
            self.save(doc)
            return doc
        else:
            return self.create(creator, name, instruction, tags)

    def save(self, doc):
        """Save an instruction.

        Returns None if the save was successful, a message explaining why it
        failed otherwise.
        """
        try:
            doc.validate()
            self.coll.save(doc.to_python())
        except ShieldException as e:
            return str(e)

        creator = self.users.get(doc.creator_id)
        self.repo.commit(self._repo_key(creator, doc), doc.instruction,
                         author=signature(creator.name, creator.name))

    def delete(self, doc):
        """Delete an instruction.

        Returns True if the deletion was successful.
        """
        return self.coll.remove(doc.id)['n'] == 1
