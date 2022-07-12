const WebSocket = require('ws');
const chalk = require('chalk');
const crypto = require("crypto");
const uuid = require("uuid");

class baseRocketWebSocket extends WebSocket {
    #session = '';
    #userId = null;
    #token = null;
    #user = '';
    #password = '';

    _constDirectMsg = 'd'
    _constRoomMsg = 'r'

    #onResults = []

    static DEBUG = {
        // send: true,
        // sendMethod: false
    }

    constructor(server, user, pass) {
        super(server, {
            handshakeTimeout: 1000
        });
        this.#user = user;
        this.#password = pass;
        // console.log(server);
        this.on('error', function message(error) {
            // console.error("[Err]: " + payload);
            console.info("[%s] RocketChat %s", chalk.red('Error'), error.message);

        });

        this.on('close', function message(code) {
            this.log(chalk.red('Closed'), 'Connection closed with code ' + code)
            // console.info("[%s] Connection closed with code %s", chalk.red('Closed'), code);
        });
    }

    /**
     * Send payload to make connection with upstream
     */
    connect = (onConnected, onError) => {
        // this.log(chalk.green('connect'), 'Connecting to upstream')
        this.on('open', () => {
            this.send({
                payload: {
                    "msg": "connect",
                    "version": "1",
                    "support": ["1"]
                }
            })
        });

        this.on('message', function message(payload) {
            payload = JSON.parse(payload);
            // console.log(payload);
            const { msg } = payload;
            // console.log('[%s] %s', chalk.green('↓'), chalk.green(msg));
            switch (msg) {
                case 'updated': //skip process this event
                    break;
                case 'added': //skip process this event
                    break;
                case 'connected':
                    this.#onConnected(payload, onConnected);
                    break;
                case 'result':
                    this.#onResult(payload);
                    break;
                case 'ping':
                    this.#onPing(payload);
                    break;
                default:
                    console.log('[%s] %s %s', chalk.green('↓'), chalk.green(msg), payload);
            }
        });
    }

    /**
     * Do thing when upstream accepted connection
     * @param {object} payload 
     */
    #onConnected = (payload, onConnected) => {
        // console.log(payload);
        this.#session = payload.session;
        this.log(chalk.green('connected'), 'Connected to upstream with session ID ' + chalk.green(this.#session))
        onConnected()
    }

    #onResult = (payload) => {
        this.debug('onResult', payload);
        const { msg, id, result, error } = payload;
        if (this.#onResults[id] == undefined) {
            this.log(chalk.red('!'), 'onResult not defined for: ' + id)
            return;
        }
        console.log('[%s] %s %s', chalk.green('↓'), chalk.green(msg), id);
        const { onResult, onError, debug } = this.#onResults[id];
        if (result)
            onResult(payload, debug)
        if (error)
            onError(payload, debug)
        //free up listener
        delete this.#onResults[id];
    }

    /**
     * Send Ping-Pong message to upstream to keep connection alive
     */
    #onPing = () => {
        console.log('[%s] %s', chalk.green('↓'), 'ping');
        this.send({
            payload: {
                "msg": "pong",
            }
        })
    }

    login = (onSuccess, onError) => {
        this.sendMethod({
            method: 'login',
            payload: {
                "params": [
                    {
                        "user": { "username": this.#user },
                        "password": {
                            "digest": password2sha256(this.#password),
                            "algorithm": "sha-256"
                        }
                    }
                ]
            }, onResult: ({ error, result }) => {
                // console.log(payload)
                if (error) {
                    this.log(chalk.red('Error'), 'Login error:  ' + error.message)
                    onError(error);
                    // process.exit(1);
                }
                this.#userId = result.id;
                this.#token = result.token
                this.log(chalk.green('√'), 'Logged in with user id  ' + this.#userId)
                onSuccess(result);
            }
        })
    }

    sendMethod = ({ method, payload, onResult, onError, debug = false }) => {
        this.debug('sendMethod', payload, debug)
        const id = this.#uuid(method)
        this.#onResults[id] = { onResult, onError, debug };
        this.send({
            payload: {
                "msg": "method",
                "method": method,
                "id": id,
                ...payload
            },
            debug
        })
    }

    send = ({ payload, onResult = null, debug = false }) => {
        // console.log(payload)
        this.debug('send', payload, debug)
        this.log(chalk.blue('↑'), (payload.method ?? payload.msg) + ' ' + (payload?.id ?? ''));
        super.send(JSON.stringify(payload))
    }

    #uuid = (id) => {
        return id + '_' + uuid.v4()
    }

    log = (type, message) => {
        console.log('[%s] %s', type, message);
    }
    debug = (type, payload, force = false) => {
        if (force ?? rocketWebsocket.DEBUG[type] ?? false) {
            console.log('vv------------------- %s (%s) --------------------vv', chalk.red('DEBUG'), type)
            console.log(payload);
            console.log('^^------------------------------------------------^^')
        }
    }


}

const password2sha256 = (input) => {
    // console.log(input)
    const hash = crypto.createHash('sha256').update(input).digest('hex');;
    // console.log(hash)
    return hash;
}

module.exports = baseRocketWebSocket;