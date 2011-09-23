var tubes = require('./tubes.js')

function Redirect(location) {
    var redirectCode = 301
    var message = '<html><head><title>Redirect</title></head><body><h1>Permanent Redirect: <a href="' + location + '">' + location + '</a></body></html>'
    var headers = {'Content-Type': 'text/html', 'Location': location}

    this.canned = new tubes.CannedResponse(message, redirectCode, headers)
}
exports.Redirect = Redirect

Redirect.prototype.process = function process(trans) {
    return this.canned.process(trans)
}
