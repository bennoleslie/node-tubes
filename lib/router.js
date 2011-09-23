function Router(routes) {
    this.routes = routes
}
exports.Router = Router

Router.prototype.process = function process(trans) {
    var i
    for (i = 0; i < this.routes.length; i++) {
        var test = this.routes[i][0]
        if (typeof(test) === 'string' ? test === trans.url : test.test(trans.url)) {
            return this.routes[i][1]
        }
    }

    trans.status = 404
    return 'client-error'
}
