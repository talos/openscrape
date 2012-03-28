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
    client_landing = 'client/index.html',
    db_name = 'openscrape_%(MODE)s',
    db_port = '27017',
    db_host = 'localhost',
    app_host = 'http://localhost',
    app_port = '8100',
    template_dir = './client/js/src/templates',
    jsongit_dir = 'data/%(MODE)s.jsongit',
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

# only allow magic cookie for test mode
if MODE == 'test':
    MAGIC_COOKIE = PARSER.get('test', 'magic_cookie')
    import warnings
    warnings.warn('In test mode, magic cookie is in effect!')
else:
    MAGIC_COOKIE = None

DB_NAME = PARSER.get(MODE, 'db_name')
DB_PORT = int(PARSER.get(MODE, 'db_port'))
DB_HOST = PARSER.get(MODE, 'db_host')
COOKIE_SECRET = PARSER.get(MODE, 'cookie_secret')
RECV_SPEC = PARSER.get(MODE, 'recv_spec')
SEND_SPEC = PARSER.get(MODE, 'send_spec')
JSONGIT_DIR = PARSER.get(MODE, 'jsongit_dir')
TEMPLATE_DIR = PARSER.get(MODE, 'template_dir')
VALID_URL_CHARS = PARSER.get(MODE, 'valid_url_chars')
APP_HOST = PARSER.get(MODE, 'app_host')
APP_PORT = PARSER.get(MODE, 'app_port')
CLIENT_LANDING = PARSER.get(MODE, 'client_landing')
