/**
 * 'VirtualHosts' provide a very simple way associating different
 * tube lines with a given virtual host.
 *
 *
 */
function VirtualHosts(hosts) {
    this.hosts = {}
    for (var i = 0; i < hosts.length; i++) {
        if (hosts[i] instanceof Array) {
            this.hosts[hosts[i][0]] = hosts[i][1]
        } else {
            this.hosts[hosts[i]] = hosts[i]
        }
    }
}
exports.VirtualHosts = VirtualHosts

VirtualHosts.prototype.process = function process(trans) {
    if (! (trans.reqHeaders.host in this.hosts) ) {
        trans.status = 400
        return 'client-error'
    }
    return this.hosts[trans.reqHeaders.host]
}
