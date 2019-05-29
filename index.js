require('rootpath')();
import * as config from 'vue-sockets-server/config/config.js';

const Runner = require('vue-sockets-server/services/runner');
const runner = new Runner(config);
runner.init().catch(error => console.error(error));
runner.listen();
