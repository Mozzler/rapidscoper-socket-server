const config = require('./config/config');
const runner = require('vue-sockets-server/runner')(config);
const db = require('vue-sockets-server/services/db');
const socket = require('./services/sockets');

function configure (runner) {
    const io = runner.initIO();
    const socketIO = new socket(io);

    /*
    db.get().collection('team').aggregate([
        { "$lookup":
          {
            from: "userTeam",
            localField: "_id",
            foreignField : "teamId",
            as: "userTeam"
          }
        },
    ]).toArray((err, items) => {
        console.log(items)
    });
*/
    runner.listen();
}

runner.init()
    .then(() => configure(runner))
    .catch(error => console.error(error));


