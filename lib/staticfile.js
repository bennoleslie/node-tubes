var tubes = require('tubes')
var fs = require('fs')

function StaticFile(filename, options) {
    if (options === undefined) options = {}

    this.filename = filename

    this.headers = {}

    this.headers['content-type'] = options['content-type']
    if (this.headers['content-type'] === undefined) {
	this.headers['content-type'] = mt.guessType(filename)
    }

    if (options['max-age'] !== undefined) {
	this.headers['cache-control'] = 'max-age=' + options['max-age']
    }
}
exports.StaticFile = StaticFile

StaticFile.prototype.process = function process(trans) {
    var that = this

    if (!(trans.method === 'GET' || trans.method === 'HEAD')) {
        trans.logger.debug('ERROR: bad method', trans.method)
        trans.status = 405
        return "client-error"
    }

    fs.readFile(that.filename, onRead)

    function onRead(err, data) {
        if (err) {
	    trans.logger.warn('Unable to read static file', that.filename)
            trans.status = 500
            trans.cont('client-error')
            return
        }

        trans.status = 200
	trans.pushResHeaders(that.headers)
	trans.pushResHeaders({'content-length': data.length})

        if (trans.method === 'GET') {
            var gen = new tubes.Generator(data)
            gen.prepare(trans)
            trans.pushResponseChain(gen)
        }
        trans.cont(true)
    }
}
