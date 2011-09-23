/**
 * node tubes main implementation.
 */
var http = require('http')
var https = require('https')
var util = require('util')
var grabbag = require('grabbag')
var events = require('events')
exports.SimpleLogger = require('./simplelogger.js').SimpleLogger
exports.PassThrough = require('./passthrough.js').PassThrough
exports.Router = require('./router.js').Router
exports.AssetManager = require('./assetmanager.js').AssetManager
exports.StaticDir = require('./assetmanager.js').StaticDir
exports.LessDir = require('./assetmanager.js').LessDir
exports.TemplateDir = require('./templatemanager.js').TemplateDir // FIXME: Rename file 
exports.VirtualHosts = require('./vhost.js').VirtualHosts
exports.Redirect = require('./redirect.js').Redirect
exports.Authenticator = require('./auth.js').Authenticator
exports.FormParser = require('./formparser.js').FormParser

var tubes = exports /* alias the current module */

function Service(servers, map, options) {
    options = options || {}
    this.servers = new Array()
    this.map = map
    this.logger = options.logger || new tubes.SimpleLogger()

    for (serverName in servers) {
        if (servers.hasOwnProperty(serverName)) {
            if (this.map[serverName] === undefined) {
                throw new Error("Each server must have a named Tube Line in the Tube Map")
            }
            this.servers.push(new Server(serverName, this, this.logger, servers[serverName]))
        }
    }
}
exports.Service = Service

Service.prototype.start = function start() {
    for (var i = 0; i < this.servers.length; i++) {
        this.servers[i].listen()
    }
}

Service.prototype.handleTransaction = function handleTransaction(trans) {
    var tubeLine = this.map[trans.server.name]
    trans._start(tubeLine)
}

function Tap() {
}

Tap.prototype.process = function process(trans) {
    if (trans.reqHeaders.cookie) {
        trans.reqCookies = grabbag.parseCookie(trans.reqHeaders.cookie)
    } else {
        trans.reqCookies = {}
    }
    return true
}


exports.tap = new Tap()

function Server(name, service, logger, options) {
    var that = this
    this.name = name
    if (options.launcherFd !== undefined) {
        if (options.fd !== undefined || options.port !== undefined || options.iface !== undefined) {
            throw new Error('When specifying launcherFd, don\'t specify iface, port or fd.')
        }

        for (var i = 0; i < process.argv.length - 1; i++) {
            if (process.argv[i] === '--fd') {
                var parts = process.argv[i + 1].split(',')
                if (parts.length != 2) {
                    throw new Error('malformed --fd argument passed \'' + process.argv[i + 1] + '\'')
                }

                if (parts[0] === options.launcherFd) {
                    this.fd = parseInt(parts[1])
                    break
                }
            }
        }
        if (this.fd === undefined) {
            throw new Error('Unable to find launched file descriptor')
        }
    } else if (options.fd !== undefined) {
        if (options.port !== undefined || options.iface !== undefined) {
            throw new Error('When specifying fd, don\'t specify iface or port.')
        }
        this.fd = options.fd
    } else {
        if (options.port === undefined || options.iface === undefined) {
            throw new Error('Must specify launcherFd or fd or port/iface.')
        }
        this.port = options.port
        this.iface = options.iface
    }

    this.service = service
    this.logger = logger

    if (options.secure === true) {
        this.s = https.createServer()
    } else {
        this.s = http.createServer()
    }


    this.logger.debug("Server %s started", this.name)

    this.s.on('request', onRequest)

    function onRequest(req, res) {
        that.logger.debug('{%s} %s %s', that.name, req.url, req.method, req.headers)
        var trans = new Transaction(req, res, that, that.service)
        that.service.handleTransaction(trans)
    }
}

Server.prototype.listen = function listen() {
    if (this.fd) {
        this.s.listenFD(this.fd)
    } else {
        this.logger.debug("Attempting to listen on port: %s iface: %s", this.port, this.iface)
        this.s.listen(this.port, this.iface)
    }
}

function RequestReader(trans) {
    var that = this

    this.pending = []
    this.finished = false

    events.EventEmitter.call(this)
    this.trans = trans

    this.trans.req.on('data', function(buffer) {
        if (that.paused) {
            that.pending.push(buffer)
        } else {
            that.emit('data', trans, buffer)
        }
    })
    this.trans.req.on('end', function() {
        if (that.paused) {
            that.finished = true
        } else {
            that.emit('end', trans)
        }
    })
    this.trans.req.on('aborted', function() {
        that.emit('aborted', trans)
    })
    this.trans.req.on('error', function(err) {
        that.emit('error', trans, buffer)
    })
}
util.inherits(RequestReader, events.EventEmitter)
RequestReader.prototype.outputFormat = 'data'

RequestReader.prototype.pause = function pause() {
    this.paused = true
}

RequestReader.prototype.resume = function resume() {
    this.paused = false
    while (this.pending.length) {
        this.emit('data', this.trans, this.pending.shift())
    }
    if (this.finished) {
        this.emit('end', this.trans)
    }
}

function Transaction(req, res, server, service) {
    this.req = req
    this.res = res
    this.server = server
    this.service = service
    this.logger = service.logger

    this.method = this.req.method
    this.status = null

    this.url = req.url

    this.reqHeaders = req.headers
    this.resHeaders = {}

    this.lineStack = []

    this.requestChain = [new RequestReader(this)]
    this.responseChain = []

    this.phase = 'request'

    this.paused = false
}

Transaction.prototype._start = function _start(line) {
    this.curTubeLine = line
    this.curIndex = 0
    var res = this.curTubeLine[this.curIndex].process(this)
    if (res !== undefined) {
        this.cont(res)
    }
}

Transaction.prototype.cont = function cont(res) {
    for (;;) {
        if (res instanceof Array) {
            this.logger.debug("        = new line")
        } else {
            this.logger.debug("        = ", res, this.lineStack.length, this.curIndex)
        }
        if (res instanceof Array) {


            this.lineStack.push({'pos':this.curIndex, 'tube':this.curTubeLine})
            this.curIndex = 0
            this.curTubeLine = res
        } else if (typeof(res) === 'string') {

            var nextInLine = this.service.map[res]
            if (nextInLine === undefined) {
                throw new Error('Couldn\'t find a new line for: ' + res)
            }

            if (nextInLine instanceof _NoReturn) {
                nextInLine = nextInLine.value
                this.lineStack = []
            } else {
                this.lineStack.push({'pos':this.curIndex, 'tube':this.curTubeLine})
            }
            this.curIndex = 0
            this.curTubeLine = nextInLine
        } else {
            if (this.curIndex + 1 >= this.curTubeLine.length) {
                /* End of the line */
                console.log("blah", this.curIndex, this.curTubeLine.length)
                var caller = this.lineStack.pop()

                if (caller === undefined) {
                    /* Reached the end of the map */
                    if (res === true) {
                        console.log("END OF LINE")
                        break
                    } else {
                        this.curTubeLine = undefined
                    }
                } else {
                    this.curIndex = caller.pos
                    this.curTubeLine = caller.tube
                    continue
                }
            } else {
                this.curIndex++
            }
        }

        var nextHandler = this.curTubeLine[this.curIndex]
        this.logger.debug("    Handle: %d-%d", this.lineStack.length, this.curIndex)
        res = nextHandler.process(this)
        if (typeof(res) == typeof([])) {
            this.logger.debug("        returned new line")
        } else {
            this.logger.debug("        returned", res)
        }
        if (res === undefined) {
            /* will be called back */
            if (this.requestChain.length === 0 || this.requestChain[this.requestChain.length - 1].outputFormat !== 'null') {
                this.pauseRequest()
//              this.logger.debug('        - pausing request (%s - %s)', this.requestChain.length, this.requestChain[this.requestChain.length - 1])
            }
            this.logger.debug("        - waiting")
            break
        }
    }
}

Transaction.prototype.pauseRequest = function pauseRequest() {
    if (this.paused || this.phase != 'request') { return }
    this.req.pause()
    for (var i = 0; i < this.requestChain.length; i++) {
        if (this.requestChain[i].pause) {
            this.requestChain[i].pause()
        }
    }
    this.paused = true
}

Transaction.prototype.resumeRequest = function resumeRequest() {
    if (!this.paused) { return }
    this.req.resume()
    for (var i = 0; i < this.requestChain.length; i++) {
        if (this.requestChain[i].resume) {
            this.requestChain[i].resume()
        }
    }
    this.paused = false
}

Transaction.prototype.pushRequestChain = function pushRequestChain(object, handlers) {
    /* Push something on to the input chain */
    var last = this.requestChain[this.requestChain.length - 1]
    if (last === undefined) {
        lastFormat = 'data'
    } else {
        lastFormat = last.outputFormat
    }

    if (lastFormat !== object.inputFormat) {
        throw new Error('Can\'t push on to response chain: output format: ' + lastFormat + ' inputFormat: ' + object.inputFormat)
    }

    for (key in handlers) {
        last.on(key, handlers[key])
    }
    this.requestChain.push(object)

    if (object.outputFormat === 'null') {
        this.resumeRequest()
    }
}

Transaction.prototype.pushResponseChain = function pushResponseChain(object, handlers) {
    this.phase = 'response'
    this.resumeRequest()

    /* Push something on to the output */
    var last = this.responseChain[this.responseChain.length - 1]
    if (last === undefined) {
        lastFormat = 'null'
    } else {
        lastFormat = last.outputFormat
    }
    if (lastFormat !== object.inputFormat) {
        throw new Error('Can\'t push on to response chain: output format: ' + lastFormat + ' inputFormat: ' + object.inputFormat)
    }

    if (object.inputFormat === 'null' && handlers !== undefined) {
        throw new Error('Can\'t specify handlers when inputFormat is null')
    }
    for (key in handlers) {
        last.on(key, handlers[key])
    }
    this.responseChain.push(object)
}



function Generator(data) {
    events.EventEmitter.call(this)
    this.data = data
}
util.inherits(Generator, events.EventEmitter)
exports.Generator = Generator

Generator.prototype.inputFormat = 'null'
Generator.prototype.outputFormat = 'data'

Generator.prototype.prepare = function prepare(trans) {
    var that = this
    process.nextTick(function () {
        if (trans.paused) {
            return
        }
        that.resume(trans)
    })
}

Generator.prototype.pause = function pause(trans) {
    trans.paused = true
}

Generator.prototype.resume = function resume(trans) {
    this.emit('end', trans, this.data)
}


function CannedResponse(body, status, headers) {
    if (status === undefined) {
        status = 200
    }
    this.status = status
    this.headers = headers || {'Content-Type' : 'text/plain'}
    this.generator = new Generator(body)
}
exports.CannedResponse = CannedResponse

CannedResponse.prototype.process = function process(trans) {
    trans.resHeaders = this.headers
    if (this.status === null && trans.status === null) {
        throw new Error('Empty status canned responsed can only be used on lines that set the response')
    }
    if (this.status !== null && trans.status !== null) {
        throw new Error('Explicit status canned responsed can only be used on lines that do not set the response')
    }

    if (this.status !== null) {
        trans.status = this.status
    }

    this.generator.prepare(trans)
    trans.pushResponseChain(this.generator)

    return true
}




function Drain() {
}

Drain.prototype.inputFormat = 'data'
Drain.prototype.outputFormat = 'null'

Drain.prototype.process = function process(trans) {
    if (trans.status === undefined) {
        throw new Error('Can not return if there is no response code set')
    }

    trans.res.writeHead(trans.status, trans.resHeaders)

    if (trans.responseChain.length != 0) {
        trans.pushResponseChain(this,
                                {
                                    'data': function(trans, data) {
                                        trans.res.write(data)
                                    },
                                    'end': function(trans, data) {
                                        trans.res.end(data)
                                    }
                                }
                               )
    } else {
        trans.res.end()
    }
    trans.resumeRequest()
    return true
}

exports.drain = new Drain()

function _NoReturn (value) { this.value = value}

function NoReturn(tubish) {
    return new _NoReturn(tubish)
}
exports.NoReturn = NoReturn
