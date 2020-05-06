const debug = require('debug')('pinza:daemon')
const Core = require('../core'); //OneloveEncoderService client.
const Components = require('../core/components')
const Http = require('../http')

class Daemon {
    constructor(options) {
        this._options = options || {};
        this.repoPath = options.repoPath;
        this.config = new Components.Config(this.repoPath)
    }
    _apiEndpoints(iteratorCallback) {

    }
    async start() {
        await this.config.open(); //Load config into memory. Use this.config if planning to run custom startup options.

        //Custom start up options here
        debug("starting")
        this.client = new Core(this._options); //Customize at will
        await this.client.start();
        
        //Public API
        this.http = new Http(this.client)
        await this.http.start();
    }
    async stop() {
        await this.http.stop();
        await this.client.stop();
    }
}
module.exports = Daemon