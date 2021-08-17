const axios = require('axios');
const {
    Datastore
} = require('@google-cloud/datastore');

function Helpers(GameBot) {
    this.GameBot = GameBot;

    this.interaction = {
        id: GameBot.req.id,
        token: GameBot.req.token
    };

    this.workingDirectory = GameBot.workingDirectory;

    this.db = new Datastore(GameBot.dbConfig);
}

Helpers.prototype.shuffle = function(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * i);
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }

    return array;
}

Helpers.prototype.normalize = function(input) {
    if (input.normalize) {
        return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    } else {
        return input;
    }
}


Helpers.prototype.respond = function(content, callback) {
    return axios.patch(
            `https://discord.com/api/v8/webhooks/${this.GameBot.secrets.APPLICATION_ID}/${this.interaction.token}/messages/@original`,
            content, {
                headers: {
                    "Authorization": `Bot ${this.GameBot.secrets.BOT_TOKEN}`
                }
            }
        )
        .catch((err) => {
            this.errorHandler(err);
        })
        .finally(() => {
            if (callback) {
                callback();
            } else {
                this.GameBot.end();
            }
        });
}

Helpers.prototype.sendMessage = function(content, callback) {
    return axios.post(
            `https://discord.com/api/v8/webhooks/${this.GameBot.secrets.APPLICATION_ID}/${this.interaction.token}`,
            content, {
                headers: {
                    "Authorization": `Bot ${this.GameBot.secrets.BOT_TOKEN}`
                }
            }
        )
        .catch((err) => {
            this.errorHandler(err);
        })
        .finally(() => {
            if (callback) {
                callback();
            } else {
                this.GameBot.end();
            }
        });
}

Helpers.prototype.errorHandler = function(err) {
    axios.post(
            `https://discord.com/api/v8/webhooks/${this.GameBot.secrets.APPLICATION_ID}/${this.interaction.token}`, {
                "content": "Sorry, but something went wrong. ``(" + err.toString() + ")``",
                "flags": 64
            }, {
                headers: {
                    "Authorization": `Bot ${this.GameBot.secrets.BOT_TOKEN}`
                }
            }
        )
        .catch((err) => {
            console.log(err.toString());
        })
        .finally(() => {
            this.GameBot.end();
        });
}

Helpers.prototype.end = function() {
    this.GameBot.end();
}


Helpers.prototype.saveData = function(entities, callback) {
    const transaction = this.db.transaction();
    transaction.run((err) => {
        transaction.save(entities);

        transaction.commit((err) => {
            if (err) {
                console.log(err);
            }

            callback(entities);
        });
    });
}

module.exports = Helpers;
