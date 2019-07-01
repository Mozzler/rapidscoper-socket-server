const config = require('./config/config');
const constants = require('./config/constants');
const runner = require('vue-sockets-server/runner')(config);

function configure (runner) {
    runner.initIO(constants);
    runner.listen();
}

runner.init()
    .then(() => configure(runner))
    .catch(error => console.error(error));


