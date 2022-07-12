const uuid = require("uuid");
const baseRocketWebSocket = require('./lib/baseRocketWebSocket')
// rocketWebsocket.DEBUG = {
//     send: false,
//     sendMethod: false,
//     result: true
// }
class rocketWebsocketWrapper extends baseRocketWebSocket {
    getRooms = ({ onResult, onError }) => {
        this.sendMethod({ method: 'rooms/get', onResult: onResult, onError: onError });
    }

    /**
     * Create a room for direct message.
     * if a room has already been established, does not result in an error. In addition, the same roomID is returned.
     * @param {string} uid 
     * @param {callable} onCreated 
     * @param {callable} onError 
     */
    createDirectMessage = ({ uid, onCreated, onError }, debug = false) => {
        this.sendMethod({
            method: 'createDirectMessage',
            payload: { "params": typeof (uuid) == 'string' ? [uid] : uid },
            onResult: ({ result }) => onCreated(result),
            onError: ({ error }) => onError(error),
            debug
        });
    }

    /**
     * Send direct message to an RocketChat user.
     * 1. Create nor get room between bot and user
     * 2. Send message to the room
     * @param {object} payload Payload get from queue
     */
    sendDirectMessage = (payload, debug = false) => {
        this.debug('sendDirectMessage', payload, debug)
        const { t, uid, message } = payload;
        this.createDirectMessage({
            uid,
            onCreated: room => {
                const { rid } = room
                this.sendRoomMessage({ rid, message }, debug);
            },
            onError: error => {
                console.log('onError', error)
            }
        }, debug);


    }

    /**
     * 
     * @param {object} payload 
     * @param {boolean} debug 
     */
    sendRoomMessage = (payload, debug) => {
        this.debug('sendRoomMessage', payload, debug)
        const { rid, message } = payload;
        this.sendMethod({
            method: 'sendMessage',
            payload: {
                "params": [
                    {
                        "_id": uuid.v4(),
                        "rid": rid,
                        "msg": message
                    }
                ]
            },
            onResult: payload => console.log,
            debug
        })

    }
}
module.exports = rocketWebsocketWrapper;