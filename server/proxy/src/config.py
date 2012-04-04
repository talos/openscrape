import uuid
import os
import logging
import sys
import subprocess
from ConfigParser import SafeConfigParser

# if launched from app.py (rather than a test), look for the mode explicitly
if sys.argv[0].split(os.path.sep)[-1] == 'app.py':
    if len(sys.argv) != 3:
        print("""
    Openscrape proxy must be invoked with a two arguments:

    python server/proxy/proxy.py <MODE> <URI>

        MODE which mode from `config/proxy.ini` to use: Look at `config/proxy.ini`
             for defined modes. Defaults are `production`, `staging`, and `test`.
        URI  the URI of the socket used to communicate with the jar via IPC.
    """)
        sys.exit(1)
    else:
        MODE = sys.argv[1]
        BACKEND_URI = sys.argv[2]
else:
    MODE = 'test'
    # this hack determines the backend's socket on the fly, since we can't
    # pass in the arg to nosetests.
    ps = subprocess.Popen(['ps', 'aux'], stdout=subprocess.PIPE)
    grep = subprocess.Popen(['grep', '[s]erver/proxy/bin/caustic.jar'],
                            stdin=ps.stdout, stdout=subprocess.PIPE)

    out, err = grep.communicate()
    if grep.returncode == 0:
        ipc = out.rstrip().split(' ')[-1]
    else:
        ipc = None

    if ipc:
        logging.debug('Used ps aux to find caustic socket: %s' % ipc)
        BACKEND_URI = ipc
    else:
        sys.exit("Could not find a caustic backend jar running, cannot test.")


PARSER = SafeConfigParser(dict(
    mode = MODE,
    scheme = 'http',
    host = 'localhost',
    port = '8100',
    max_request_length = '10000',
    recv_spec = 'ipc://openscrape_proxy:1',
    send_spec = 'ipc://openscrape_proxy:0',
    reqs_per_hour = '60'
))

if not len(PARSER.read('config/proxy.ini')):
    print "No config/proxy.ini file found in this directory.  Writing a config..."

    for mode in ['production', 'staging', 'test']:
        PARSER.add_section(mode)
        PARSER.set(mode, 'cookie_secret', str(uuid.uuid4()))

    try:
        conf = open('config/proxy.ini', 'w')
        PARSER.write(conf)
        conf.close()
    except IOError:
        print "Could not write config file to `config/proxy.ini`, exiting..."
        sys.exit(1)

HOST = PARSER.get(MODE, 'host')
PORT = PARSER.get(MODE, 'port')
MAX_REQUEST_LENGTH = PARSER.getint(MODE, 'max_request_length')
SCHEME = PARSER.get(MODE, 'scheme')
RECV_SPEC = PARSER.get(MODE, 'recv_spec')
SEND_SPEC = PARSER.get(MODE, 'send_spec')
REQS_PER_HOUR = PARSER.getint(MODE, 'reqs_per_hour')
COOKIE_SECRET = PARSER.get(MODE, 'cookie_secret')

