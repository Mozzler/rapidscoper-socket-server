const db = require('vue-sockets-server/services/db');
const ObjectID = require('mongodb').ObjectID;
const uuid = require('uuid/v4');
const _ = require('lodash');
const constants = require('./config/constants');

class SocketService {
    constructor(io, API) {
        this.io = io;
        this.user_sockets = {};

        this.API = API;
        this.initListeners();
    }

    initListeners () {
        this.io.on('connection', (socket) => {
            console.log(`NEW SOCKET ${socket.id}`);

            socket.on('join_collection', async (data, snapshot, cb) => {
                let [permissionFilter, userId] = await this.API.getPermissionsFilter(data.token, data.model);

                const response = {
                    streamId: uuid(),
                    snapshot: null,
                    error: false
                };

                if (!permissionFilter) {
                    response.error = true;
                    cb(response);
                }

                Object.assign(data, {
                    user_id: userId,
                    permission_filter: permissionFilter,
                });


                if (snapshot) {
                    response.snapshot = await this.getSnapshot(data);
                }

                this.handleConnection(socket, data, response.streamId);

                cb(response);
            });

            socket.on('disconnect', () => {
                console.log(`DISCONNECTED SOCKET ${socket.id}`);

                const user_id = _.findKey(this.user_sockets, obj => {
                    return Object.keys(obj).includes(socket.id);
                });

                if (this.user_sockets[user_id] && this.user_sockets[user_id][socket.id]) {
                    Object.keys(this.user_sockets[user_id][socket.id].streams).forEach(stream_id => {
                        this.user_sockets[user_id][socket.id].streams[stream_id].change_stream.close();
                    });

                    delete this.user_sockets[user_id][socket.id];
                }
            });

            socket.on('left_collection', ({user_id, stream_id}) => {
                console.log(`DISCONNECTED STREAM ${stream_id}`);

                if (this.user_sockets[user_id] &&
                    this.user_sockets[user_id][socket.id] &&
                    this.user_sockets[user_id][socket.id].streams[stream_id]) {

                    this.user_sockets[user_id][socket.id].streams[stream_id].change_stream.close();
                    delete this.user_sockets[user_id][socket.id].streams[stream_id];
                }
            });

            socket.on('recreate_watcher', async ({model, token, initialStreamId}) => {
                console.log(`RECREATE WATCHER ${model} ${token}`);

                const [permissions, userId] = await this.API.getPermissionsFilter(token, model);
                const userSockets = this.user_sockets[userId];

                const collection = this.API.getModelByKey(model);
                const mongoCollection = db.get().collection(collection);

                if (userSockets) {
                    Object.keys(userSockets).forEach(async (socketId) => {
                        const streamList = userSockets[socketId].streams;
                        const streamId = Object.keys(streamList).find(streamId => streamList[streamId].model === model);
                        
                        streamList[streamId].change_stream.close();

                        const filter = this.filterToBson({
                            filter: streamList[streamId].filter,
                            permission_filter: permissions
                        });

                        streamList[streamId].change_stream = mongoCollection.watch(
                            filter, { fullDocument: 'updateLookup' }
                        ).on('change', item => {
                            const response = {
                                operationType: item.operationType,
                                fullDocument: item.fullDocument,
                                model: model
                            };

                            socket.emit('mongo_data', response);
                        });

                        const data = await this.getSnapshot({
                            model: model,
                            filter: streamList[streamId].filter,
                            permission_filter: permissions
                        });

                        if (initialStreamId !== streamId) {
                            userSockets[socketId].socket_obj.emit('update_dataset', { list: data, model: model });
                        }
                    });
                }
            });

            socket.on('token_refreshed_recreate', async ({user_id, token}) => {
                console.log('TOKEN WAS EXPIRED, TRYING TO REFRESH!');
                this.user_sockets[user_id][socket.id].token = token;
                const available_models = await this.API.getPermissionsFilter(token, null, true);

                if (available_models) {
                    this.handleSocketStreamsRecreation(user_id, socket.id, available_models);
                }
            });
        });

        this.subscribeToUserRoles();
    }

    async getSnapshot (data) {
        const collection = this.API.getModelByKey(data.model);
        const mongoCollection = db.get().collection(collection);

        let filters = this.filterToBson({
            filter: this.filterToSnapshot(data.filter),
            permission_filter: this.filterToSnapshot(data.permission_filter)
        });

        return {
            items: await mongoCollection.aggregate(filters).toArray()
        };
    }

    handleConnection(socket, data, streamId) {
        const socketObj = {
            token: data.token,
            socket_obj: socket,
            streams: {}
        };

        if (!this.user_sockets[data.user_id]) {
            this.user_sockets[data.user_id] = {
                [socket.id]: socketObj
            }
        } else if (!this.user_sockets[data.user_id][socket.id]) {
            this.user_sockets[data.user_id][socket.id] = socketObj;
        } else {
            this.user_sockets[data.user_id][socket.id].token = data.token;
        }

        this.addMongoListener(socket, data, streamId);
    }

    filterToSnapshot (filters) {
        const data = {
            $or: []
        };

        if (!filters) {
            return;
        }

        filters.$or.forEach((el, index) => {
            let [key, value] = [ Object.keys(el)[0], Object.values(el)[0] ];
            data.$or.push({
                [key.replace(/fullDocument|documentKey|\./gi, '')]: value
            });
        });

        return data;
    }

    filterToBson(data) {
        const filter = [{
            $match: {
                $and: []
            }
        }];

        if (data.filter) {
            filter[0].$match.$and.push(data.filter);
        }
        if (data.permission_filter) {
            filter[0].$match.$and.push(data.permission_filter);
        }

        this.castFilter(filter);
        return filter;
    }

    addMongoListener(socket, data, streamId) {
        const collection = this.API.getModelByKey(data.model);
        const mongoCollection = db.get().collection(collection);
        let filter = this.filterToBson(data);

        console.log(`NEW STREAM ${streamId}`);

        this.user_sockets[data.user_id][socket.id].streams[streamId] = {
            model: data.model,
            filter: data.filter
        };

        this.user_sockets[data.user_id][socket.id].streams[streamId].change_stream = mongoCollection.watch(
            filter, { fullDocument: 'updateLookup' }
        ).on('change', item => {
            const response = {
                operationType: item.operationType,
                fullDocument: item.fullDocument,
                model: data.model
            };

            socket.emit('mongo_data', response);
        });
    }

    castFilter(filter) {
        const iterate = (obj) => {
            Object.keys(obj).forEach(key => {
                if (typeof obj[key] != 'number' && ObjectID.isValid(obj[key])) {
                    obj[key] = ObjectID(obj[key]);
                }

                if (typeof obj[key] === 'object' && !(obj[key] instanceof ObjectID)) {
                    iterate(obj[key])
                }
            });
        };

        iterate(filter);
    }

    subscribeToUserRoles() {
        const filter = [{
            $match: {
                $and: [
                    {'updateDescription.updatedFields.roles': {$exists: true }},
                    { operationType: 'update'}
                ]
            }
        }];

        db.get().collection(this.API.getModelByKey('user')).watch(
            filter,
        ).on('change', data => {
            console.log('USER ROLE WAS CHANGED !');
            const user_id = data.documentKey._id.toString();

            if (this.user_sockets[user_id] && Object.keys(this.user_sockets[user_id].length > 0)) {
                this.recreateUserStreams(user_id);
            }
        });
    }

    // WE NEED TO HANDLE SITUATION WHEN USER MAY BE LOGGED IN FROM MULTIPLE DEVICES
    // IN THIS CASE WE NEED SEPARATE STREAM RECREATION FOR MULTIPLE INDEPENDENT FLOWS
    // BASED ON AMOUNT OF CURRENT ONLINE DEVICES AND CHECK TOKENS ACCROSS ALL SOCKETS
    async recreateUserStreams(user_id) {
        for(let socket_id of Object.keys(this.user_sockets[user_id])) {
            const available_models = await this.API.getPermissionsFilter(this.user_sockets[user_id][socket_id].token, null, true);

            if (available_models) {
                this.handleSocketStreamsRecreation(user_id, socket_id, available_models);
            } else {
                // Send event to client to refresh user Token
                this.user_sockets[user_id][socket_id].socket_obj.emit('token_refresh_recreate');
            }
        }
    }

    handleSocketStreamsRecreation(user_id, socket_id, available_models) {
        let streamsToRecreate = [];

        _.forEach(this.user_sockets[user_id][socket_id].streams, (stream_obj, stream_id) => {
            const model = stream_obj.model;

            let permission_filter = this.API.getFilter(available_models, model);

            streamsToRecreate.push({
                stream_id,
                socket: this.user_sockets[user_id][socket_id].socket_obj,
                data: {
                    user_id,
                    model: stream_obj.model,
                    filter: stream_obj.filter,
                    permission_filter
                }
            });

            stream_obj.change_stream.close();
        });

        _.forEach(streamsToRecreate, stream_data => {
            this.addMongoListener(stream_data.socket, stream_data.data, stream_data.stream_id);
        });
    }
}

module.exports = SocketService;
