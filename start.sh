#!/bin/bash

# start up the java backend
java -Djava.library.path=/usr/local/lib -classpath /Users/talos/Programming/jzmq/src/ -jar server/caustic_backend.jar > log/caustic_backend.log 2>&1 &

# spin up brubeck
python server/proxy.py production > log/proxy.log 2>&1 &
