const autobahn = require('autobahn');
const wsuri = "ws://127.0.0.1:9000/";

//The Subprocess
const exchangeFeedConnectors = require('./ExchangeFeedConnectors');

class MarketStream {
  constructor() {

    this.messageHandlers = {
      details: this.connect.bind(this)
    };

    process.on('message', this.onServerMessage.bind(this));
    process.on('disconnect', this.onDisconnect.bind(this));
  }

  onServerMessage(message) {
    console.log('Received message from Parent ', message);

    for (let key in message) {
      this.messageHandlers[key] && this.messageHandlers[key](message[key]); 
    }
  }

  onDisconnect() {
    console.log('Disconnect Message Received');
  }

  connect(details) {

    let {exchange, pair} = details;
    let self = this;

    console.log(`Received exchange details from Server (${exchange} | ${pair}`);

    this.exchangeHandler = new exchangeFeedConnectors[exchange]();

    if(this.exchangeHandler) {
      this.exchangeHandler.connect(pair, this.streamHandler.bind(this))

        .then(() => {
          console.log('connected to exchange');
          self.connection = new autobahn.Connection({ url: wsuri, real: 'realm2' });
          self.connection.onopen = (session) => {
            self.session = session;
          }
          self.connection.open();
        })

        .catch((err) => {
          console.error(err);
        });

    } else {
      process.send({
        connect: false
      });
    }
  }

  streamHandler(data) {
    console.log('Receiving Data ....');
    if (this.session) {
      console.log('Publishing Data ...');
      this.session.publish('marketfeed', [data]);
    }
  }
}

new MarketStream();

