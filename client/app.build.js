({
    appDir: "./src",
    baseUrl: ".",
    dir: "./static/js",
    //Comment out the optimize line if you want
    //the code minified by UglifyJS.
    //optimize: "none",

    paths: {
        //"jquery": "require-jquery"
        "async": './lib/require-async'
    },

    modules: [
        {
            name: "openscrape.main"
        }
    ]
})
