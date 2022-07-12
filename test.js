require('dotenv').config();
const rocketWebsocketWrapper = require('./');

const envParams = ['ROCKET_CHAT_WS', 'ROCKET_CHAT_USER', 'ROCKET_CHAT_PASS']
envParams.forEach(function (i) {
    if (process.env[i] == undefined) {
        console.error('Config is missing in .env! Please check "%s" then restart', i)
        process.exit()
    }
})

const rocket = new rocketWebsocketWrapper(process.env.ROCKET_CHAT_WS, process.env.ROCKET_CHAT_USER, process.env.ROCKET_CHAT_PASS);
rocket.on('close', (err) => {
    console.log('Auto-reconnecting...')
})
rocket.connect(
    connected => {
        console.log('Connected with upstream')
        rocket.getRooms({
            onResult: console.log,
            onError: console.error,
        })
    },
    error => console.error
);