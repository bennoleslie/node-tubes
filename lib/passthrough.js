/**
 * The passthrough module provides a very simple tube called 'PassThrough'.
 */

/**
 * The PassThrough tube does nothing.
 *
 * PassThrough constructor takes one optional parameter 'name'. This
 * name is just used for debugging purposes.
 */
function PassThrough(name) {
    this.name = name || 'unknown'
}
exports.PassThrough = PassThrough

PassThrough.prototype.process = function process(trans) {
    return true
}
