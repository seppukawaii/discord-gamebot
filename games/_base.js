const {
    Datastore
} = require('@google-cloud/datastore');

class BaseGame {
    player;
    channel;

    entity = {};

    db = new Datastore({
        namespace: 'partytime'
    });

    constructor(req, res, config) {
        this.helpers = require('../helpers')(req, res);
        this.channel = req.body.channel_id;
        this.player = req.body.member ? req.body.member.user.id.toString() : req.body.user.id.toString();
        this.options = req.body.data.options;
	this.config = config;

        if (this.constructor.name == 'BaseGame') {
            const query = this.db.createQuery('Game').filter('channel', '=', this.channel).order('createdAt', {
                descending: true
            });

            this.db.runQuery(query, (err, entities, info) => {
                if (err || entities.length == 0 || entities[0].state == 'done') {
                    this[req.body.data.name]();
                } else {
                    req.body.entity = entities[0];

                    var ActiveGame = require(`${this.config.hostDirectory}/games/${req.body.entity.game}`)(this);
                    new ActiveGame(req, res);
                }
            });
        } else {
            this.entity = req.body.entity;
            this.init(() => {
                if (req.body.data.component_type) {
                    this.play(req.body.data);
                } else {
                    this[req.body.data.name]();
                }
            });
        }
    }

    init(callback) {
        callback();
    }

    setup() {
        if (this.constructor.name == 'BaseGame') {
            this.helpers.saveData([{
                key: this.db.key('Game'),
                data: {
                    channel: this.channel,
                    game: this.options.game,
                    createdAt: (new Date()).toISOString(),
                    state: 'pending',
                    players: [
                        this.player
                    ]
                }
            }], (entities) => {
                var gameID = entities[0].key.id;
                this.helpers.saveData([{
                    key: this.db.key('Player', `${gameID}_${this.player}`),
                    data: {
                        game: gameID,
                        player: this.player
                    }
                }], () => {
                    var newGame = require(`./${this.options.game}`);
                    this.helpers.respond({
                        "content": "Setting up the game..."
                    }, () => {
                        this.helpers.sendMessage({
                            "content": `<@${this.player}> has initiated a new game of ${newGame.prototype.displayName}!  Type **/join** to get in on the action and **/start** to begin the game.`
                        });
                    });
                });
            });
        } else {
            this.helpers.respond({
                "content": "There is already a game running.",
            });
        }
    }

    gameStarted() {
        if (this.entity.state == 'active') {
            return true;
        } else {
            this.helpers.respond({
                "content": "The game hasn't started yet. Maybe you want to **/start** it?"
            });

            return false;
        }
    }

    join() {
        if (this.entity.state == 'active') {
            this.helpers.respond({
                "content": "The game has already started."
            });
        } else if (this.entity.state == 'pending') {
            if (this.entity.players.includes(this.player)) {
                this.helpers.respond({
                    "content": "You already joined this game!",
                });
            } else {
                this.helpers.respond({
                    "content": "Joining the game..."
                }, () => {
                    this.entity.players.push(this.player);
                    this.helpers.saveData([{
                        key: this.entity[this.db.KEY],
                        data: this.entity
                    }, {
                        key: this.db.key('Player', `${this.entity[this.db.KEY].id}_${this.player}`),
                        data: {
                            game: this.entity[this.db.KEY].id,
                            player: this.player
                        }
                    }], () => {
                        this.helpers.sendMessage({
                            "content": `<@${this.player}> has joined the game!`
                        });
                    });
                });
            }
        } else {
            this.helpers.respond({
                "content": "There isn't a game running right now. Maybe you want to /setup one?"
            });
        }
    }

    playerJoined() {
        if (this.entity.players.includes(this.player)) {
            return true;
        } else {
            this.helpers.respond({
                "content": "You aren't signed up for this game."
            });
            return false;
        }
    }

    playerActive() {
        if (this.playerJoined()) {
            if (this.player == this.entity.players[this.entity.currentPlayer]) {
                return true;
            } else {
                this.helpers.respond({
                    "content": "You aren't the active player yet."
                });
                return false;
            }
        } else {
            return false;
        }
    }

    start() {
        if (this.entity.state == 'active') {
            this.helpers.respond({
                "content": "The game has already started."
            });
        } else if (this.entity.state == 'pending') {
            this.helpers.respond({
                "content": "Starting the game..."
            }, () => {
                this.entity.state = 'active';
                this.helpers.saveData([{
                    key: this.entity[this.db.KEY],
                    data: this.entity
                }], () => {
                    this.startGame();
                });
            });
        } else {
            this.helpers.respond({
                "content": "There isn't a game running right now. Maybe you want to /setup one?"
            });
        }
    }

    startGame() {
        console.log("the game has started");
    }

    notAnOption() {
        if (this.constructor.name == "BaseGame") {
            this.helpers.respond({
                "content": "There isn't a game running right now. Maybe you want to /setup one?"
            });
        } else {
            this.helpers.respond({
                "content": "That isn't a valid option right now."
            });
        }
    }

    guess() {
        this.notAnOption();
    }

    pass() {
        this.notAnOption();
    }

    play() {
        this.notAnOption();
    }

    check() {
        this.notAnOption();
    }
}

module.exports = BaseGame;
