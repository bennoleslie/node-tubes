var path = require('path')
var grabbag = exports

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
