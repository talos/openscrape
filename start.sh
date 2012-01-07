#!/bin/bash

# start up the java backend
java -Djava.library.path=/usr/local/lib -classpath /Users/talos/Programming/jzmq/src/ -jar server/caustic_backend.jar > log/caustic_backend.log 2>&1 &

# start up mongrel
m2sh load -config mongrel2.conf -db the.db
m2sh start -db the.db -host localhost > log/mongrel2.log 2>&1 &

# spin up brubeck
python server/http_receiver.py > log/http_receiver.log 2>&1 &