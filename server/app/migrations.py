#!usr/bin/env python

'''
When executed, this will load in a set of pre-made instructions from the test
fixtures.
'''

import jsongit
from test.fixtures.migrations import docs
from src import database, config

db = database.get_db(config.DB_HOST, config.DB_PORT, config.DB_NAME)
users = database.Users(db)
instructions = database.Instructions(users, jsongit.init(config.JSONGIT_DIR), db)

user = users.find('openscrape') or  users.create('openscrape',
                                                 email='data@openscrape.com',
                                                 provider='migration')

assert 'id' in user

for doc in docs:
    tags = [str(tag) for tag in doc.get('tags', [])]
    instructions.save_or_create(user, doc['name'], doc['instruction'], tags)

