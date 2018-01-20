var autobahn = require('autobahn');
var _ = require('underscore');

var wsuri = "wss://api.poloniex.com";


class PoloniexConnector {
  constructor(pair) {
    
    this.connection = new autobahn.Connection({
      url: wsuri,
      realm: "realm1"
    });

    this.pair = pair;
    this.connection.onClose = this.onClose.bind(this);

  }

  open() {

    return new Promise((resolve, reject) => {


      this.connection.onopen = function (session, details) {

        console.log('Established Connection to Exchange');

        session.subscribe('ticker', this.onTickPrep.bind(this))

          .then(resolve)

          .catch(reject);
      };

      this.connection.open();
    });
  }

  onTickPrep(args, kwargs, details) {

    console.log('Price Tick');
    if (args) {
      if (args[0] === this.pair) {
        this.onTick({
          timestamp: Date.now(),
          ticker: args[0],
          lastPrice: parseFloat(args[1]),
          lowestAsk: parseFloat(args[2]),
          highestBid: parseFloat(args[3]),
          change: parseFloat(args[4]),
          baseVolume: parseFloat(args[5]),
          quoteVol: parseFloat(args[6]),
          isFrozen: args[7],
          high24hr: parseFloat(args[8]),
          low24hr: parseFloat(args[9])
        });
      }
    }
  }

  onTick() {
    //should get overridden by client
  }

  onClose(reason, details) {
    console.log('Connection Closed, reason: ', reason);
  }
}

module.exports = PoloniexConnector;

