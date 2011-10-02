var util = require('util')
var events = require('events')


function SlowDownFilter() {
}
util.inherits(SlowDownFilter, events.EventEmitter)

SlowDownFilter.prototype.getHandlers = function getHandlers() {
    var that = this

    function handleData(trans, data) {
        var mbs = (trans.requestBytes / 1024 / 1024) /   ((Date.now() - trans.requestStart) / 1000)
        var target = 1
        var targetmillis = trans.requestBytes / 1024 / 1024 / target * 1000
        var actualmillis = Date.now() - trans.requestStart
        trans.requestBytes += data.length

        that.emit('data', trans, data)

        if (targetmillis > actualmillis) {
            trans.pauseRequest()
            setTimeout(function () { trans.resumeRequest() }, targetmillis - actualmillis)
        }
    }

    function handleEnd(trans) {
        var mbs = (trans.requestBytes / 1024 / 1024) /   ((Date.now() - trans.requestStart) / 1000)
        that.emit('end', trans)
    }

    return {'data': handleData, 'end': handleEnd}
}

SlowDownFilter.prototype.inputFormat = 'data'
SlowDownFilter.prototype.outputFormat = 'data'

var slowdown = new SlowDownFilter()

function SlowDown() {
}
exports.SlowDown = SlowDown

SlowDown.prototype.process = function process(trans) {
    trans.requestBytes = 0
    trans.requestStart = Date.now()
    trans.pushRequestChain(slowdown, slowdown.getHandlers())
    return true
}
