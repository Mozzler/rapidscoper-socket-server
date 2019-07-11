const config = require('./config/config');
const constants = require('./config/constants');
const runner = require('vue-sockets-server/runner')(config);
const SocketService = require('./sockets');
const PermissionService = require('vue-sockets-server/services/permission-api');

function configure (runner) {
    const io = runner.initIO();
    const permissionService = new PermissionService(config.WEB_API_URL, constants);

    new SocketService(io, permissionService);
    runner.listen();
}

runner.init()
    .then(() => configure(runner))
    .catch(error => console.error(error));


