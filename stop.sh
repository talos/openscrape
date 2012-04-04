#!/bin/bash

# stop java and the python processes

kill $(ps aux | grep '[s]erver/proxy/bin/caustic.jar' | awk '{print $2}')
kill $(ps aux | grep '[p]ython server/proxy/src/proxy.py' | awk '{print $2}')
kill $(ps aux | grep '[p]ython server/app/src/app.py' | awk '{print $2}')
kill $(ps aux | grep '[m]ongod' | awk '{print $2}')
