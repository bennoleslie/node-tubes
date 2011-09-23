var util = require('util')
var events = require('events')
var formidable = require('formidable')

function FormParser(trans, validFields) {
    var that = this
    var part
    events.EventEmitter.call(this)
    this.form = new formidable.IncomingForm()


    function start() {
        that.form.onPart = onPart
        that.form.on('error', onError)
        that.form.on('aborted', onAborted)
        that.form.on('end', onEnd)
        that.form.writeHeaders(trans.reqHeaders)
    }

    function onError(err) {
        that.emit('error', trans, err)
    }

    function onAborted() {
        that.emit('aborted', trans)
    }

    function onPart(_part) {
        part = _part
        if (validFields === undefined || validFields.indexOf(part.name) != -1) {
            part.on('data', onPartData)
            part.on('end', onPartEnd)

            if (part.filename === null) {
                field = ''
                /* if it isn't a file field, we buffer the data before emitting an event */
            } else {
                that.emit('fileStart', trans, part.name, part.filename, part.mime)
            }
        }
    }

    function onPartData(chunk) {
        if (part.filename === null) {
            field += chunk.toString('ascii') /* FIXME: Should this be utf-8 */
        } else {
            that.emit('fileData', trans, chunk)
        }
    }

    function onPartEnd() {
        if (part.filename === null) {
            that.emit('field', trans, part.name, field)
        } else {
            that.emit('fileEnd')
        }
    }

    function onEnd() {
        that.emit('end', trans)
    }

    start()
}
util.inherits(FormParser, events.EventEmitter)
exports.FormParser = FormParser

FormParser.prototype.inputFormat = 'data'
FormParser.prototype.outputFormat = 'formfile'

FormParser.prototype.getHandlers = function getHandlers() {
    var that = this
    function handleData(trans, data) {
	console.log("GOT DATA", data.length)
	that.form.write(data)
    }

    function handleEnd(trans) {
	console.log(".... end")
	var err = that.form._parser.end()
	console.log("err", err)
	if (err) {
	    that.emit('error', err)
	}
    }

    return {'data': handleData, 'end': handleEnd}
}