#!/bin/bash

# start up the java backend
#java -Djava.library.path=/usr/local/lib -classpath /Users/talos/Programming/jzmq/src/ -jar server/caustic_backend.jar > log/caustic_backend.log 2>&1 &

# start up mongrel
m2sh load
m2sh start -name caustic -sudo

# spin up brubeck
#workon caustic
#python server/http_receiver.py > log/http_receiver.log 2>&1 &

ps ax | grep java
ps ax | grep mong
ps ax | grep python
