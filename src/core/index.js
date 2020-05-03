const Components = require('./components')
const Utils = require('./utils')
const mergeOptions = require('merge-options')

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
    }
    async start() {
        await this.config.open()
    }
    async stop() {
        this.config.save()
    }
}
module.exports = Core;