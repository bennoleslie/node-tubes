var dust = require('dustjs')
var fs = require('fs')
var tubes = require('./tubes.js')
var util = require('util')

function Template(dir, source, name) {
    this.dir = dir
    this.dust = dir.dust
    this.name = name
    this.source = source
    this.reloadTemplate()
    this.ignoreMethod = false
}


Template.prototype.reloadTemplate = function reloadTemplate() {
    var templateData = fs.readFileSync(this.source, "utf8")
    this.dust.compileFn(templateData, this.name)
}

Template.prototype.process = function process(trans) {

    if (!this.ignoreMethod && !(trans.method === 'GET' || trans.method === 'HEAD')) {
        trans.logger.debug('ERROR: bad method', trans.method, this.ignoreMethod)
        trans.status = 405
        return "client-error"
    }

    if (true) {
        this.dir.reload()
    }

    this.dust.render(this.name, {trans: trans, assetHref: function (chunk, context, bodies, params) { return chunk.write("href=" + params.url); }}, cb)

    function cb(error, data) {
        if (error) {
            trans.status = 500
            trans.cont('server-error')
            return
        }
        if (trans.status === null) {
            trans.status = 200
        }
        if (trans.method !== 'HEAD') {
            var gen = new tubes.Generator(data)
            gen.prepare(trans)
            trans.pushResponseChain(gen)
        }
        trans.cont(true)
    }
}

function TemplateDir(templateDir) {
    this.dust = dust.create()

    /* Disable whitespace compression */
    this.dust.optimizers.format = function(ctx, node) { return node };

    this.t = {}
    var templateFiles = fs.readdirSync(templateDir)
    for (var i = 0; i < templateFiles.length; i++) {
        var fileName = templateFiles[i]
        var parts = fileName.split('.', 2)
        if (parts[1] === 'dust') {
            var name = parts[0]
            this.t[name] = new Template(this, templateDir + fileName, name)
        }
    }
}
exports.TemplateDir = TemplateDir

TemplateDir.prototype.reload = function reload() {
    for (var x in this.t) {
        this.t[x].reloadTemplate()
    }
}