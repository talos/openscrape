from ConfigParser import SafeConfigParser
import sys
import uuid

if len(sys.argv) != 2:
    print """
Openscrape app must be invoked with a single argument, telling it
which mode from `config/app.ini` to use:

python server/app/app.py <MODE>

Look at `config/app.ini` for defined modes. Defaults are `production`,
`staging`, and `test`."""
    sys.exit(1)

MODE = sys.argv[1]
PARSER = SafeConfigParser(dict(
    mode = MODE,
    db_name = 'openscrape_%(MODE)s',
    db_port = '27017',
    db_host = 'localhost',
    app_host = 'http://localhost',
    app_port = '8100',
    template_dir = './client/js/src/templates',
    json_git_dir = 'data/%(MODE)s.jsongit',
    recv_spec = 'ipc://openscrape_app:1',
    send_spec = 'ipc://openscrape_app:0',
    valid_url_chars = '\w\-'
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
COOKIE_SECRET = PARSER.get(MODE, 'cookie_secret')
RECV_SPEC = PARSER.get(MODE, 'recv_spec')
SEND_SPEC = PARSER.get(MODE, 'send_spec')
JSON_GIT_DIR = PARSER.get(MODE, 'json_git_dir')
TEMPLATE_DIR = PARSER.get(MODE, 'template_dir')
VALID_URL_CHARS = PARSER.get(MODE, 'valid_url_chars')
APP_HOST = PARSER.get(MODE, 'app_host')
APP_PORT = PARSER.get(MODE, 'app_port')
