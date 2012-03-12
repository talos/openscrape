import validictory

import schema

from dictshield.document import Document
from dictshield.base import ShieldException
from dictshield.fields import StringField, BooleanField, DictField
from dictshield.fields.compound import ListField
from dictshield.fields.mongo import ObjectIdField

class InstructionField(DictField):
    """
    A DictField that can only hold instructions validated by schema.
    """

    def validate(self, value):
        super(DictField, self).validate(value)
        try:
            validictory.validate(value, schema.INSTRUCTION)
        except ValueError as instruction_err:
            errors = []
            # We don't know which schema it failed against, if it wasn't within
            # a 'then' block we may be able to be more specific.
            try:
                validictory.validate(value, schema.FIND)
            except ValueError as find_err:
                errors.append(find_err)

            try:
                validictory.validate(value, schema.LOAD)
            except ValueError as load_err:
                errors.append(load_err)

            if not errors:
                errors = [instruction_err]

            raise ShieldException("Invalid Instruction: %s" % errors,
                                  'instruction', value)

class InstructionDocument(Document):
    """
    An Instruction Document has not just the instruction, but also a name, tags,
    and a creator ID.
    """
    id = ObjectIdField(id_field=True)
    creator_id = ObjectIdField(required=True)
    name = StringField(required=True)
    tags = ListField(StringField())
    instruction = InstructionField(required=True)

class User(Document):
    """
    A user who can clone, make push requests, and pull instructions.
    """
    id = ObjectIdField(id_field=True)
    name = StringField(required=True)
    deleted = BooleanField(default=False)

    _private_fields = [deleted]
