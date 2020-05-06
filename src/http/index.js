const Hapi = require('@hapi/hapi');

class http {
    constructor(app) {
        this.app = app;
    }
    async start() {
        this.server = Hapi.server({
            port: this.app.config.get("http.port"),
            host: this.app.config.get("http.host"),

            routes: {
                cors: true
            }
        });
        this.server.app.encoderService = this.app;
        this.server.route(require('./routes'));
        await this.server.start();
    }
    async stop() {
        await this.server.stop()
    }
}
module.exports = http;