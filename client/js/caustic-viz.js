$(document).ready(function() {
    var caustic_server = "http://localhost:1337/request",
    data = '{"id":"bleh","instruction":"http://accursedware.com:6767/property","force":"true"}';

    $.post(caustic_server, data);
});