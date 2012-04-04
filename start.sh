#!/bin/bash

# start java, mongod, and python processes
MODE='test'

if [ -z "$1" ]
then
    echo "No mode defined, defaulting to ${MODE}"
else
    MODE=$1
fi

CAUSTIC_CONF=config/caustic.conf
DEFAULT_JAVA_LIB=/usr/local/lib # location of jzmq library
DEFAULT_SOCKET=ipc://caustic.ipc # socket used to communicate between caustic & proxy, should be IPC
if [ ! -e "${CAUSTIC_CONF}" ]
then
    echo "No config for caustic found at ${CAUSTIC_CONF}, writing one..."
    echo "#!/bin/sh" >${CAUSTIC_CONF}
    echo "" >>${CAUSTIC_CONF}
    echo "SOCKET=${DEFAULT_SOCKET}" >>${CAUSTIC_CONF}
    echo "JAVA_LIB=${DEFAULT_JAVA_LIB}" >>${CAUSTIC_CONF}
fi

source ${CAUSTIC_CONF}

java -Djava.library.path=${JAVA_LIB} -jar server/proxy/bin/caustic.jar ${SOCKET} >>log/caustic.log 2>&1 &
python server/proxy/src/proxy.py ${MODE} ${SOCKET} >>log/proxy.log 2>&1 &

mongod -f config/mongodb.conf >>log/mongodb.log 2>&1 &
python server/app/src/app.py ${MODE} >>log/app.log 2>&1 &

python server/app/migrations.py
