# -*- coding: utf-8 -*-

"""
caustic.database
"""

import pymongo
import jsongit
import dictshield

import models

def get_db(host, port, name):
    db = pymongo.Connection(host, port)[name]
    db.safe = True
    return db


class DatabaseError(RuntimeError):
    """
    This is raised when a DB operation goes wrong.
    """
    pass


class DuplicateError(RuntimeError):
    """
    This is raised when everything is dandy, but it was a dupe.
    """
    pass


class ValidationError(RuntimeError):
    """
    This is raised when a model is no good.  Should be from a ShieldException.
    """
    def __init__(self, shield_exc):
        super(RuntimeError, self).__init__(shield_exc)
        self.field_name = shield_exc.field_name
        self.field_value = shield_exc.field_value


class Users(object):
    """Collection of users.  Ensures uniqueness of non-deleted
    names and provider/provider_id combos.
    """

    def __init__(self, db):
        self.coll = db.users
        self.coll.safe = True
        self.coll.ensure_index('name', unique=True)
        self.coll.ensure_index('email', unique=True)
        self.deleted = db.deleted_users

    def create(self, name, **kwargs):
        """Create a new user object.  Raises a DatabaseError or DuplicateError
        if it can't be saved, or a ShieldException if it is invalid.

        Returns the new object.
        """
        try:
            kwargs['name'] = name
            u = models.User(**kwargs)
            u.validate()
            id = self.coll.insert(u.to_python(), safe=True)
            u.id = id
            return u
        except dictshield.base.ShieldException as e:
            raise ValidationError(e)
        except pymongo.errors.DuplicateKeyError as e:
            raise DuplicateError()
        except pymongo.errors.OperationFailure as e:
            raise DatabaseError(e)

    def save(self, user):
        """Save an existing user object.

        Raises a DatabaseError if it can't be saved or ShieldException if it
        is invalid, or a KeyError if it does not exist.
        """
        try:
            user.validate()
            resp = self.coll.update(user.to_python(), safe=True)
            if resp['n'] == 0:
                raise KeyError("No user %s" + user.to_json())
        except dictshield.base.ShieldException as e:
            raise ValidationError(e)
        except pymongo.errors.OperationFailure as e:
            raise DatabaseError(e)

    def get(self, id):
        """Get a user by id.

        Returns the User or None.
        """
        u = self.coll.find_one(id)
        return models.User(**u) if u else None

    def find(self, name_or_email):
        """Get a user by name or email.

        Returns the User or None.
        """
        if name_or_email.find('@') == -1: # names can't have @, quick check for email
            u = self.coll.find_one({'name': name_or_email})
        else:
            u = self.coll.find_one({'email': name_or_email})

        return models.User(**u) if u else None

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
        self.coll.safe = True
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
            return [models.InstructionDocument(**i) for i in cursor]
        else:
            return None

    def find(self, creator_name, name):
        """Find an instruction by creator name and its own name.

        Returns the InstructionDocument or None.
        """
        u = self.users.find(creator_name)
        if u:
            i = self.coll.find_one({'creator_id': u.id, 'name': name})
            return models.InstructionDocument(**i) if i else None
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
            return [models.InstructionDocument(**i) for i in cursor]
        else:
            return None

    def save_or_create(self, creator, name, instruction, tags):
        """Create an instruction for a creator, or update the existing one
        with tags and instruction.

        Returns the (possibly updated) InstructionDocument.

        Raises a ValidationError or DatabaseError if something else goes wrong.
        """
        doc = self.find(creator.name, name)
        if doc:
            doc.instruction = instruction
            doc.tags = tags
        else:
            doc = models.InstructionDocument(creator_id=creator.id,
                                             name=name,
                                             instruction=instruction,
                                             tags=tags)

        try:
            doc.validate()
            creator = self.users.get(doc.creator_id)
            self.repo.commit(self._repo_key(creator, doc), doc.instruction,
                             author=jsongit.signature(creator.name, creator.name))
            doc.id = self.coll.save(doc.to_python(), manipulate=True, safe=True)
            return doc
        except dictshield.base.ShieldException as e:
            raise ValidationError(e)
        except pymongo.errors.OperationFailure as e:
            raise DatabaseError(e)

    def delete(self, doc):
        """Delete an instruction.

        Returns True if the deletion was successful.
        """
        return self.coll.remove(doc.id)['n'] == 1
