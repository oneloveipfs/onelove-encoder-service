const Components = require('./components')
const Utils = require('./utils')
const mergeOptions = require('merge-options')
const Javalon = require('javalon')
const IPFSHTTPClient = require('ipfs-http-client')
/**
 * Main application entry point.
 */
class Core {
    constructor(options) {
        const defaults = {
            path: Utils.repoPath()
        };
        this._options = mergeOptions(defaults, options);
        this.config = new Components.Config(Utils.datastore(this._options.path))
        this.avalon = Javalon;
        this.encoder = new Components.EncoderService(this);
        this.ipfs = new IPFSHTTPClient();
    }
    async start() {
        await this.config.open()
        this.avalon.config.api = [this.config.get("avalon.endpoint")]
        //this.db = await Components.Mongodb(this.config.get("Database"))
        this.encoder.start()
    }
    async stop() {
        this.config.save()
    }
}
module.exports = Core;