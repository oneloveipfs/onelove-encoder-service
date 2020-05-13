module.exports = [
    {
        method: 'GET',
        path: '/addqueue',
        handler: async function (request, h) { 
            var {encoderService} = request.server.app;
            var {url} = request.query;
            try {
                return h.response(await encoderService.encoder.addToQueueFromdtube(url))
            } catch (err) {
                return err
            }
        }
    },
    {
        method: 'GET',
        path: '/status',
        handler: async function (request, h) { 
            var {encoderService} = request.server.app;
            var {id} = request.query;
            try {
                return h.response(await encoderService.encoder.getStatus(id))
            } catch (err) {
                return err
            }
        }
    }
]