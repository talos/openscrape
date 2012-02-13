all:
	# Compress all JS files into a tidy lil package
	rm -f client/js/openscrape.min.js
	cat client/js/openscrape.* | uglifyjs -o client/js/openscrape.min.js

clean:
	rm client/js/openscrape.min.js
