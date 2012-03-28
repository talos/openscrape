"""
Test the validation schema for instructions using our migration data.
"""

from helpers import unittest
import validictory

import server.app.schema as schema
from data.migrations import docs

class TestSchema(unittest.TestCase):

    def test_migration_instructions(self):
        """
        Test all the instructions in data/migrations.py
        """
        for instruction in [doc['instruction'] for doc in docs]:
            try:
                validictory.validate(instruction, schema.INSTRUCTION)
            except validictory.ValidationError as e:
                self.fail("Validation error %s trying to validate %s" % (e, instruction))

