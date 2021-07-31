const nacl = require('tweetnacl');
const axios = require('axios');
const https = require('https');
const fs = require('fs');

module.exports = class GameBot {
    constructor(config) {
        const defaultConfig = {
            workingDirectory: '/workspace',
            secretsFile: `secrets.json`,
            commandsFile: 'commands.json',
            dbConfig: {}
        };

        Object.entries(defaultConfig).forEach(entry => {
            const [key, value] = entry;

            if (config[key]) {
                this[key] = config[key];
            } else {
                this[key] = value;
            }
        });

        this.secrets = JSON.parse(fs.readFileSync(this.workingDirectory + '/' + this.secretsFile, 'utf8'));
        this.commands = JSON.parse(fs.readFileSync(this.workingDirectory + '/' + this.commandsFile, 'utf8'));
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
                        url: `https://${req.headers.host}/${process.env.K_SERVICE}`,
                        method: req.method,
                        headers: {
                            'X-Signature-Ed25519': req.get('X-Signature-Ed25519'),
                            'X-Signature-Timestamp': req.get('X-Signature-Timestamp')
                        },
                        data: req.body
                    });
                        const command = this.commands.find((command) => command.name == req.body.data.name);
                        let response = {
                            type: 5
                        };
                        if (!command.publicAck) {
                            response.data = {
                                flags: 64
                            }
                        }
                        res.status(200).json(response);
                } else {
                    if (req.body.data.options) {
                        req.body.data.options = req.body.data.options.reduce((obj, item) => Object.assign(obj, {
                            [item.name]: item.value
                        }), {});
                    }

                    this.req = req.body;
                    this.end = function() {
                        res.end();
                    }
                    this.helpers = require('./helpers.js')(this);

                    fs.access(`${this.workingDirectory}/functions/${req.body.data.name}.js`, fs.constants.R_OK, (err) => {
                        if (err) {
                            const BaseGame = require('./games/_base.js');
                            new BaseGame(this);
                        } else {
                            require(`${this.workingDirectory}/functions/${req.body.data.name}.js`).interaction(this);
                        }
                    });
                }
            } catch (err) {
                res.status(200).json({
                    "type": 4,
                    "data": {
                        "content": `Sorry, but something went wrong. (${err.toString()})`,
                        "flags": 64
                    }
                });
            }
        }
    }
}
