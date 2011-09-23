/**
 * The simplelogger module 
 */

var EMERG = 0
var ALERT = 1
var ERROR = 3
var WARN = 4
var NOTICE = 5
var INFO = 6
var DEBUG = 7

var level2strings = { }
level2strings[EMERG] = 'EMERG'
level2strings[ALERT] = 'ALERT'
level2strings[ERROR] = 'ERROR'
level2strings[WARN] = 'WARN'
level2strings[NOTICE] = 'NOTICE'
level2strings[INFO] = 'INFO',
level2strings[DEBUG] = 'DEBUG'

/**
 * A SimpleLogger object is a very simple logging implementation; logs
 * messages are just dumped to the consule.
 *
 * The SimpleLogger provides a default implementation of the Tubes
 * Logging interface. Compatible logger interfaces should provide the
 * same functions as listed here.
 *
 * SimpleLogger constructor doesn't take any arguments.
 */
function SimpleLogger() {
}
exports.SimpleLogger = SimpleLogger

/**
 * The log method takes at least two arguments 'level' and 'message'.
 *
 * 'level' is an integer and must be one of:
 *   + 0: Emergency: system is unusable
 *   + 1: Alert: action must be taken immediately
 *   + 2: Critical: critical conditions
 *   + 3: Error: error conditions
 *   + 4: Warning: warning conditions
 *   + 5: Notice: normal but significant condition
 *   + 6: Informational: informational messages
 *   + 7: Debug: debug-level messages
 *
 * 'message' is a string that may contain printf like format flags.
 *
 * Additional arguments that are not interpolated are displayed using
 * util.inspect. More advanced loggers may, for example, store
 * additional arguments in a database.
 */
SimpleLogger.prototype.log = function log() {
    var args = Array.prototype.slice.call(arguments)
    var level = args[0]
    args.shift()

    if (level2strings[level] === undefined) {
        console.log(level2strings, DEBUG, level, DEBUG == level, level2strings[DEBUG], level2strings[level])
        throw new Error('level: \'' + level + '\' is not valid: ' )
    }

    args[0] = '[' + level2strings[level] + '] ' + args[0]
    console.log.apply(console, args)
}

SimpleLogger.prototype.emerg = function emerg() { var args = Array.prototype.slice.call(arguments); args.unshift(EMERG); this.log.apply(this, args) }
SimpleLogger.prototype.alert = function alert() { var args = Array.prototype.slice.call(arguments); args.unshift(ALERT); this.log.apply(this, args) }
SimpleLogger.prototype.error = function error() { var args = Array.prototype.slice.call(arguments); args.unshift(ERROR); this.log.apply(this, args) }
SimpleLogger.prototype.warn = function warn() { var args = Array.prototype.slice.call(arguments); args.unshift(WARN); this.log.apply(this, args) }
SimpleLogger.prototype.notice = function notice() { var args = Array.prototype.slice.call(arguments); args.unshift(NOTICE); this.log.apply(this, args) }
SimpleLogger.prototype.info = function info() { var args = Array.prototype.slice.call(arguments); args.unshift(INFO); this.log.apply(this, args) }
SimpleLogger.prototype.debug = function debug() { var args = Array.prototype.slice.call(arguments); args.unshift(DEBUG); this.log.apply(this, args) }
