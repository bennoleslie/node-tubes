var path = require('path')
var qs = require('querystring')
var grabbag = exports
var fs = require('fs')

/**
 * Returns an object with platform and arch fields.
 *
 * platform is one of 'linux2', 'darwin'.
 *
 * arch is one of 'x64', 'ia32', 'arm'.
 *
 * On node 0.4 the process object does not export the arch. In this
 * case we default to 'x64', as this is the most common platform. It
 * can be explicitly set to something else by setting the NODE_ARCH
 * environment variables appropriately.
 *
 * Originally from https://github.com/benno/node-grabbag.git
 */
function getPlatformArch() {
    var platform = process.platform
    var arch
    if (process.arch) {
        arch = process.arch
    } else if (process.env.NODE_ARCH) {
        arch = process.env.NODE_ARCH
    } else {
        arch = 'x64'
    }

    return {'platform': platform, 'arch': arch}
}
exports.getPlatformArch = getPlatformArch

/**
 * 'requireBinary' returns the path to a binary module.
 *
 * Example:
 *   var foo = require(binaryModule('foo'))
 *
 * Where you have foo.node compiled for multiple platform/arch.
 *
 * This assumes that a filesystem scheme of placing modules in
 * node_modules/<platform>-<arch>/<module> is used.
 */
function binaryModule(module) {
    var pa = grabbag.getPlatformArch()
    var str = pa.platform + '-' + pa.arch

    return path.join(str, module)
}
exports.binaryModule = binaryModule

/**
 * parseCookie takes a cookie-string 'cookie', parses it and returns an object.
 *
 * If 'cookie' is undefined, return an empty object.
 *
 * Example:
 * > parseCookie("field=value")
 * { field: 'value' }
 * > parseCookie(undefined)
 * { }
 *
 * Limitations: Currently only supports cookie-strings with a single cookie-pair.
 * Does not support parsing of cookie-values with dquotes.
 *
 * cookie-pair       = cookie-name "=" cookie-value
 * cookie-name       = token
 * cookie-value      = *cookie-octet / ( DQUOTE *cookie-octet DQUOTE )
 * cookie-octet      = %x21 / %x23-2B / %x2D-3A / %x3C-5B / %x5D-7E
 *                       ; US-ASCII characters excluding CTLs,
 *                       ; whitespace DQUOTE, comma, semicolon,
 *                       ; and backslash
 * token             = <token, defined in [RFC2616], Section 2.2>
 * CTL               =  %x00-1F / %x7F
 * DQUOTE            =  %x22
 * WSP(whitespace)   =  SP / HTAB
 *
 * See: http://tools.ietf.org/html/rfc6265
 */
function parseCookie(cookie) {
    if (cookie === undefined) {
        return {}
    }

    var parts = cookie.split('=')
    var ret = {}

    ret[parts[0]] = parts[1]

    return ret
}
exports.parseCookie = parseCookie

/**
 * charSets is an object containing useful defined set of characters.
 *
 * Fields:
 *  upper: A-Z
 *  lower: a-z
 *  digits: 0-9
 *  alphanumeric: A-Za-z0-9
 */
var charSets = {
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower: 'abcdefghijklmnopqrstuvwxyz',
    digits: '0123456789'
}
charSets.alphanumeric = charSets.upper + charSets.lower + charSets.digits
exports.charSets = charSets

/**
 * startsWith returns true iff the string 'str' starts with the string 'test'
 *
 * Example:
 *  > grabbag.startsWith("foobar", "foo")
 *  true
 *  > grabbag.startsWith("foobar", "bar")
 *  false
 */
function startsWith(str, test) {
    return str.substr(0, test.length) == test
}
exports.startsWith = startsWith

/**
 * mergeIntoObject copies all the fields from a 'source' object into the 'destination' object
 *
 * Example:
 * > dest = { a: 1, b: 2, c: 3 }
 * > src = { c: 4, d: 5, e: 6 }
 * > mergeIntoObject(dest, src)
 * > dest
 * { a: 1, b: 2, c: 4, d: 5, e: 6 }
 *
 */
function mergeIntoObject(destination, source) {
    for (var property in source) {
        if (source.hasOwnProperty(property)) {
            destination[property] = source[property]
        }
    }
}
exports.mergeIntoObject = mergeIntoObject

/**
 * Parse a 'query_string' and check that all listed fields exist and are single strings.
 *
 * If all fields exist return an object, otherwise return undefined.
 *
 * Note: It is valid for extra fields to exist.
 *
 * Example:
 * > parseQs('x=1&y=2', ['x'])
 * {x: '1'}
 * > parseQs('y=2', ['x'])
 * undefined
 * > parseQs('x=1&x=2', ['x'])
 * undefined
 *
 */
function parseQs(query_string, fields) {
    var data = qs.parse(query_string)
    for (var i = 0; i < fields.length; i++) {
        if (data[fields[i]] === undefined || typeof(data[fields[i]]) !== "string") {
            return undefined
        }
    }
    return data
}
exports.parseQs = parseQs

/**
 * Generate a pseudo-random string of a given 'length' from a given 'char_set'.
 *
 * char_set will default to the alpha-numeric (A-Z, a-z, 0-9) symbols if not
 * provided.
 *
 * Note: This function is not secure. An alternative should be used if you need
 * something secure. (For example: rbytes)
 */
function genRandomString(length, char_set) {
    var ret = ''

    if (char_set === undefined) {
        char_set = grabbag.charSets.alphanumeric
    }

    for (var i = 0; i < length; i++) {
        var random_pos = Math.floor(Math.random() * char_set.length)
        ret += char_set.substring(random_pos, random_pos+1)
    }

    return ret
}
exports.genRandomString = genRandomString


/**
 * Perform simple XML escaping.
 *
 * > xmlEscape('<foo>Bar & Baz</foo>')
 * &'lt;foo&gt; Bar &amp; Baz&lt;/foo&gt'
 */
function xmlEscape(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}
exports.xmlEscape = xmlEscape

/**
 * StateMachine provides a relatively simple way to encapsulate the logic
 * of a state-machine. The defined machine has 'states', which are simply
 * strings. Given a certain 'action' (which are also just strings), the
 * state machine moves from one state to another.
 *
 * The state machine is a standard javascript objects, keyed by the states.
 *
 * Each state has defines a list of actions it accepts, and what the next
 * state is. For example, a simple Foo machine can move from state 'FOO'
 * to state 'BAR' on an 'x' action. Schematically:
 *
 *  FOO: x -> BAR
 *  BAR:
 *
 * We define our state-machine as:
 *
 * { 'FOO' :
 *     { 'x' : 'BAR' },
 * { 'BAR' }
 *
 * Instead of simply just moving between states our machine can do some work.
 * Work can be tied to any state transfer. In this case the definition should
 * be a 2-entry list of (nextstate, function). The function is executed
 * when state transfer occurs.
 *
 * To inject actions into the state-machine call the 'action' method. The first
 * argument to action is the action name, the second argument is an array of
 * arguments to pass to the action handler.
 */
function StateMachine(machine, initialState, initialStateDate) {
    this.machine = machine
    this.state = initialState
    this.stateData = initialStateDate
}
exports.StateMachine = StateMachine

StateMachine.prototype.action = function action(action, args) {
    var nextHandler = this.machine[this.state][action]
    var curState = this.state
    var nextState = null

    if (nextHandler === undefined) {
        /* try look up generic */
        nextHandler = this.machine['*'][action]
    }
    if (nextHandler === undefined) {
        throw new Error("bad state: " + this.state + "/" + action)
    }

    if (typeof nextHandler === 'object' && nextHandler !== null) {
        this.state = nextHandler[1].apply(this, args)
        nextState = nextHandler[0]
    } else {
        nextState = nextHandler
    }

    if (nextState !== null) {
        this.state = nextState
    }
}

/**
 * Create an XML parser based on a state machine.
 *
 * 'parser' should be an object that emits 'text', 'opentag', 'closetag' and 'end'
 * events, and provides a 'write' and 'end' method. This would typically
 * be a sax.SAXStream object.
 *
 * parseStates should be the definition of a state machine that takes the following
 * actions:
 * 'o:<tagname>' - XML open tag
 * 'c:<tagname>' - XML close tag
 * 't' - XML text
 * 'e' - end of XML
 *
 * Call the 'write' and 'end' method to pump in XML data.
 */
function XmlStateMachine(parser, parseStates, initState, initStateData) {
    var sm = new grabbag.StateMachine(parseStates, initState, initStateData)
    this.parser = parser

    function openTag(tag) {
        sm.action('o:' + tag.name, [tag])
    }

    function closeTag(tagname) {
        sm.action('c:' + tagname, [])
    }

    function onText(data) {
        sm.action('t', [data])
    }

    function onEnd() {
        sm.action('e')
    }

    this.parser.on('text', onText)
    this.parser.on('opentag', openTag)
    this.parser.on('closetag', closeTag)
    this.parser.on('end', onEnd)
}
exports.XmlStateMachine = XmlStateMachine

XmlStateMachine.prototype.write = function write(chunk) {
    this.parser.write(chunk)
}

XmlStateMachine.prototype.end = function end() {
    this.parser.end()
}

/**
 * parseArgs will parse the command line arguments, returning an object.
 *
 * Currently just parses boolean arguments, and all other positions go into
 * an array called called '_'. E.g:
 * $ node script.js foo --bar baz
 * > parseArgs()
 * { _ : [foo, baz], bar: true }
 */
function parseArgs(argv) {
    if (argv === undefined) {
        argv = process.argv
    }
    var args = { _ : new Array() }
    for (var i = 2; i < argv.length; i++) {
        var arg = undefined

        if (grabbag.startsWith(argv[i], "--")) {
            arg = argv[i].substr(2)
        } else if (grabbag.startsWith(argv[i], "-")) {
            arg = argv[i].substr(1)
        }

        if (arg === undefined) {
            args._.push(argv[i])
        } else {
            args[arg] = true
        }
    }
    return args
}
exports.parseArgs = parseArgs

/**
 * Ensure that a certain directory 'path' exists. If not
 * create it with a given 'mode'.
 *
 * This is exactly the same as fs.mkdirSync, except it won't throw
 * an error if the directory already exists.
 */
function ensureDirSync(path, mode) {
     try {
         fs.mkdirSync(path, mode)
     } catch (e) {
         if (e.code !== 'EEXIST') {
             throw e
         }
     }
}
exports.ensureDirSync = ensureDirSync
