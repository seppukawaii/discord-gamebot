const nacl = require('tweetnacl');
const axios = require('axios');
const https = require('https');
const path = require('path');
const fs = require('fs');

class GameBot {
	config = {};

    constructor(config) {
        const hostDirectory = path.dirname(require.main.filename);
        const defaultConfig = {
            hostDirectory: hostDirectory,
            secrets: `${hostDirectory}/secrets.json`,
            endpoint: `https://${req.headers.host}/${process.env.K_SERVICE}`
        };

        Object.entries(defaultConfig).forEach(entry => {
            const [key, value] = entry;

            if (config[key]) {
                this.config[key] = config[key];
            } else {
                this.config[key] = value;
            }
        });
    }

    interactions(req, res) {
        const signature = req.get('X-Signature-Ed25519');
        const timestamp = req.get('X-Signature-Timestamp');
        const body = req.rawBody;

        const isVerified = nacl.sign.detached.verify(
            Buffer.from(timestamp + body),
            Buffer.from(signature, 'hex'),
            Buffer.from(this.secrets.PUBLIC_KEY, 'hex')
        );

        if (!isVerified) {
            return res.status(401).end('invalid request signature');
        }

        if (req.body.type == 1) {
            res.status(200).json({
                type: 1
            });
        } else {
            try {
                if (/Discord\-Interactions\/[\d\.]+ \(\+https:\/\/discord.com\)/.test(req.get('user-agent'))) {
                    axios({
                        httpsAgent: new https.Agent({
                            keepAlive: true
                        }),
                        url: this.config.endpoint,
                        method: req.method,
                        headers: {
                            'X-Signature-Ed25519': req.get('X-Signature-Ed25519'),
                            'X-Signature-Timestamp': req.get('X-Signature-Timestamp')
                        },
                        data: req.body
                    });
                    res.status(200).json({
                        type: 5,
                        data: {
                            flags: 64
                        }
                    });
                } else {
                    if (req.body.data.options) {
                        req.body.data.options = req.body.data.options.reduce((obj, item) => Object.assign(obj, {
                            [item.name]: item.value
                        }), {});
                    }

                    fs.access(`${this.config.hostDirectory}/games/${req.body.data.name}.js`, fs.constants.R_OK, (err) => {
                        if (err) {
                            var Game = require('./games/_base');
                            new Game(req, res, this.config);
                        } else {
                            require(`${this.config.hostDirectory}/functions/${req.body.data.name}`).interaction(req, res);
                        }
                    });
                }
            } catch (err) {
                console.log(err);
                res.status(200).json({
                    "type": 4,
                    "data": {
                        "content": "Sorry, but something went wrong.",
                        "flags": 64
                    }
                });
            }
        }
    }
}

module.exports = GameBot;
