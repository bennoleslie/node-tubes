/**
 TODO:
 */
var fs = require('fs')
var tubes = require('./tubes.js')
var less = require('less')

function AssetManager(routes, options) {
    if (options === undefined) {
        options = {}
    }
    this.routes = routes
    this.devel = true

    if (options.devel) {
        this.devel = true
    }


}
exports.AssetManager = AssetManager

AssetManager.prototype.getVersionedAsset = function getVersionedAsset(path) {
    var file = this.path2file(path)

    if (this.devel) {
        /* Don't change the path in devel mode */
        return path
    }

    var version = this.getVersion(file)
    return path + '!' + ver
}

AssetManager.prototype.path2file = function path2file(path) {
}

AssetManager.prototype.url2handler = function url2handler(url) {
    for (var i = 0; i < this.routes.length; i++) {
        var test = this.routes[i][0]
        var res = test.exec(url)
        if (res) {
            return {handler: this.routes[i][1], args: res}
        }
    }
    return null
}

AssetManager.prototype.process = function process(trans) {
    if (!(trans.method === 'GET' || trans.method === 'HEAD')) {
        trans.logger.debug('ERROR: bad method', trans.method)
        trans.status = 405
        return "client-error"
    }

    var parts = trans.url.split('!')
    var path = parts[0]
    var ver = parts[1]
    var res = this.url2handler(path)

    if (!res) {
        trans.logger.debug("NOT FOUND?")
        trans.status = 404
        return "client-error"
    } else {
        var args = []
        for (var i = 1; i < res.args.length; i++) {
            args.push(res.args[i])
        }
        var file = res.handler.getFile.apply(res.handler, args)
        if (this.devel) {
            /* regenerate */
            var args2 = new Array(args)
            args2.unshift(cb)
            res.handler.regenerate.apply(res.handler, args2)
        } else {
            cb()
        }

        function cb() {
            fs.readFile(file, onRead)

            function onRead(err, data) {
                if (err) {
                    trans.status = 404
                    trans.cont('client-error')
                    return
                }

                trans.status = 200

                if (trans.method === 'GET') {
                    var gen = new tubes.Generator(data)
                    gen.prepare(trans)
                    trans.pushResponseChain(gen)
                }
                trans.cont(true)
            }
        }
    }
}


function StaticDir(dir) {
    this.dir = dir
}
exports.StaticDir = StaticDir

StaticDir.prototype.getFile = function getFile(path) {
    return this.dir + path
}

StaticDir.prototype.regenerate = function regenerate(file) {
    /* static; don't need to do anything */
}

function LessDir(input_dir, output_dir) {
    this.input_dir = input_dir
    this.output_dir = output_dir
    this.parser = new less.Parser()
}
exports.LessDir = LessDir

LessDir.prototype.getFile = function getFile(path) {
    /* FIXME: Ensure there are no slashes in the path */
    return this.output_dir + path + ".css"
}

LessDir.prototype.regenerate = function regenerate(callback, path) {
    var inputFile = this.input_dir + path + ".less"
    var outputFile = this.getFile(path)
    try {
        var data = fs.readFileSync(inputFile)
    } catch (e) {
        console.log("CAUGHT ERROR", e)
        callback()
        return
    }

    this.parser.parse(data.toString(), function (err, tree) {
        if (err) {
            console.log("ERROR", err)
            console.log(err)
            less.writeError(err, {})
            throw new Error("Failed to generate less correctly:" + err)
        }
        fs.writeFileSync(outputFile, tree.toCSS())
        callback()
    })
}
