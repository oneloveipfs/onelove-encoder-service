module.exports = [
    {
        method: 'GET',
        path: '/addqueue',
        handler: async function (request, h) { 
            var {encoderService} = request.server.app;
            var {url} = request.query;
            try {
                await encoderService.encoder.addToQueueFromdtube(url)
            } catch (err) {
                console.log(err)
            }
            return "Ok"
        }
    }
]