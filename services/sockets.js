const db = require('vue-sockets-server/services/db');
const ObjectId = require('mongodb').ObjectId;

class MongoSocketsService {
    constructor(io) {
        this.io = io;
        this.user_sockets = {};

        this.io.on('connection', this.connect);
    }
    connect (socket) {
        console.log(`NEW CLIENT ${socket.id}`);
        socket.on('subscribe', async (data, cb) => {
            let response = null;

            if (data.model === 'user') {
                response = await db.get()
                    .collection('app.user')
                    .findOne(ObjectId(data.id));
            }
            if (data.model === 'team') {
                response = await db.get()
                    .collection('team')
                    .aggregate([
                        {
                            $lookup: {
                                from: "userTeam",
                                localField: "_id",
                                foreignField: "teamId",
                                as: "userTeam"
                            },
                        },
                        {
                            $unwind: "$userTeam"
                        },
                        {
                            $lookup: {
                                from: "project",
                                localField: "_id",
                                foreignField: "teamId",
                                as: "userTeam"
                            },
                        },
                        {
                            $match: {
                                'userTeam.userId': ObjectId(data.id)
                            }
                        },
                    ])
                    .toArray();
            }

            cb({
                data: {
                    item: response,
                    socketID: socket.id
                },
                error: false
            });
        });
    }
}

module.exports = MongoSocketsService;
