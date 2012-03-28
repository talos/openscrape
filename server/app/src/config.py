from ConfigParser import SafeConfigParser
import sys
import os
import uuid

# if launched from app.py, look for the mode explicitly
if sys.argv[0].split(os.path.sep)[-1] == 'app.py':
    if len(sys.argv) != 2:
        print("""
    Openscrape should be invoked with a single argument, telling it
    which mode from `config/app.ini` to use:

    python server/app/app.py <MODE>

    Look at `config/app.ini` for defined modes. Defaults are `production`,
    `staging`, and `test`.

    Since no mode was specified, default to test.""")
        MODE = 'test'
    else:
        MODE = sys.argv[1]
else:
    MODE = 'test'

PARSER = SafeConfigParser(dict(
    mode = MODE,
    client_landing = './client/index.html',
    session_name = 'session',
    db_name = 'openscrape_%(MODE)s', # format for sub is %(VAR)s .  Really.
    db_port = '27017',
    db_host = 'localhost',
    host = 'http://localhost',
    port = '8100',
    template_dir = './client/js/src/templates',
    jsongit_dir = 'data/%(MODE)s.jsongit',
    recv_spec = 'ipc://openscrape_app:1',
    send_spec = 'ipc://openscrape_app:0',
    partial_url_regex = r'[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9]?',
    full_url_regex = r'^%(PARTIAL_URL_REGEX)s$'
))

if not len(PARSER.read('config/app.ini')):
    print("No config/app.ini file found in this directory.  Writing a config...")

    for mode in ['production', 'staging', 'test']:
        PARSER.add_section(mode)
        PARSER.set(mode, 'cookie_secret', str(uuid.uuid4()))

    try:
        conf = open('config/app.ini', 'w')
        PARSER.write(conf)
        conf.close()
    except IOError:
        print("Could not write config file to `config/app.ini`, exiting...")
        exit(1)

DB_NAME = PARSER.get(MODE, 'db_name')
DB_PORT = int(PARSER.get(MODE, 'db_port'))
DB_HOST = PARSER.get(MODE, 'db_host')
SESSION_NAME = PARSER.get(MODE, 'session_name')
COOKIE_SECRET = PARSER.get(MODE, 'cookie_secret')
RECV_SPEC = PARSER.get(MODE, 'recv_spec')
SEND_SPEC = PARSER.get(MODE, 'send_spec')
JSONGIT_DIR = PARSER.get(MODE, 'jsongit_dir')
TEMPLATE_DIR = PARSER.get(MODE, 'template_dir')
PARTIAL_URL_REGEX = PARSER.get(MODE, 'partial_url_regex')
FULL_URL_REGEX = PARSER.get(MODE, 'full_url_regex')
HOST = PARSER.get(MODE, 'host')
PORT = PARSER.get(MODE, 'port')
CLIENT_LANDING = PARSER.get(MODE, 'client_landing')
