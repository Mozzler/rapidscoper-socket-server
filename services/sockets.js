const db = require('vue-sockets-server/services/db');
const ObjectId = require('mongodb').ObjectId;

class MongoSocketsService {
    constructor(io) {
        this.io = io;
        this.user_sockets = {};

        this.io.on('connection', (socket) => this.connect(socket, this));
    }
    connect (socket, self) {
        console.log(`NEW CLIENT ${socket.id}`);

        socket.on('subscribe', (data, cb) => self.subscribe(data, cb, socket));
        socket.on('disconnect', () => self.disconnect(socket));
    }
    watch (model, socket) {
        db.get().collection(model).watch({
            fullDocument: 'updateLookup'
        }).on('change', data => {
            const {
                operationType,
                fullDocument,
            } = data;

            socket.emit('mongo_data', { operationType, fullDocument, model });
        });
    }
    async subscribe (data, cb, socket) {
        let response = null;

        if (data.model === 'user') {
            response = await db.get()
                .collection('app.user')
                .findOne(ObjectId(data.id));

            this.watch(data.model, socket);
        }
        if (data.model === 'team') {
            response = await db.get()
                .collection('team')
                .aggregate([
                    {
                        $lookup: {
                            from: 'userTeam',
                            localField: '_id',
                            foreignField: 'teamId',
                            as: 'userTeam'
                        },
                    },
                    {
                        $unwind: '$userTeam'
                    },
                    {
                        $match: {
                            'userTeam.userId': ObjectId(data.id)
                        }
                    }
                ])
                .toArray();

            this.watch(data.model, socket);
        }

        cb({
            data: {
                item: response,
                socketID: socket.id
            },
            error: false
        });
    }
    disconnect (socket) {
        console.log(`DISCONNECTED SOCKET ${socket.id}`);

        /*
        const user_id = _.findKey(this.user_sockets, obj => {
            return Object.keys(obj).includes(socket.id);
        });

        if (this.user_sockets[user_id] && this.user_sockets[user_id][socket.id]) {
            Object.keys(this.user_sockets[user_id][socket.id].streams).forEach(stream_id => {
                this.user_sockets[user_id][socket.id].streams[stream_id].change_stream.close();
            });

            delete this.user_sockets[user_id][socket.id];
        }*/
    }
}

module.exports = MongoSocketsService;
