var autobahn = require('autobahn');
var wsuri = "wss://api.poloniex.com";
var connection = new autobahn.Connection({
  url: wsuri,
  realm: "realm1"
});

connection.onopen = function (session) {
  function marketEvent(args, kwargs) {
    console.log(args);
  }
  function tickerEvent(args, kwargs) {
    console.log(args);
  }
  function trollboxEvent(args, kwargs) {
    console.log(args);
  }
  session.subscribe('BTC_XMR', marketEvent);
  session.subscribe('ticker', tickerEvent);
  session.subscribe('trollbox', trollboxEvent);
}

connection.onclose = function () {
  console.log("Websocket connection closed");
}

connection.open();



//   tickerHandler(args, kwargs) {
//     console.log('received ticker');

//     if(args) {
//       if (args[0] === this.pair) {
//         this.data.price.history.push(this.data.price.latest);
//         this.data.timestamp = Date.now();
//         this.data.price.latest = parseFloat(args[1]);
//         this.data.price.lowestAsk = parseFloat(args[2]);
//         this.data.price.highestBid = parseFloat(args[3]);
//         //this.data.price.change = parseFloat(args[4]),
//         this.data.volume.primary = parseFloat(args[5]);
//         this.data.volume.secondary = parseFloat(args[6]);
//         //this.data.price.isFrozen = args[7],
//         this.data.price.high24hr = parseFloat(args[8]);
//         this.data.price.low24hr = parseFloat(args[9]);

//         this.streamHandler([this.data]);
//       }
//     }
//   }

//   orderBookHandler(args, kwargs) {

//     console.log('received orderbook');

//     if (args) {

//       let {data, type} = args;

//       if (type === 'orderBookModify') {
//       }

//       if (type === 'orderBookRemove') {

//       }

//       if (type === 'newTrade') {

//       }
//       this.streamHandler([this.data]);
//     } 
//   }
// }

// class PoloniexFeedConnector extends AutobahnConnection {
//   constructor() {
//     super({ url: wsuri, realm: 'realm1' });
//     this.data = {
//       price: {
//         history: []
//       },
//       volume: {},
//       orderBook: {
//         bids: {},
//         asks: {}
//       },
//       tradeHistory: {}
//     };
//   }

//   onopen(session) {
//     if (!this.streamHandler) {
//       this.error(new ReferenceError('streamHandler has not been set yet'));
//       return;
//     }
//     console.log('Session opened');

//     session.subscribe('ticker', this.tickerHandler.bind(this))

//       .then((sub) => {
//         console.log('Successfully subscribed to ', sub.topic);
//       })

//       .catch((err) => {
//         console.log('Error ',err);
//       });

//     // session.subscribe(this.channel, this.orderBookHandler.bind(this))

//     //   .then((sub) => {
//     //     console.log('Successfully subscribed to ', sub.topic);
//     //   })

//     //   .catch((err) => {
//     //     console.log('Error ', err);
//     //   });
  
//     this.ready();
//   }

//   onclose() {
//     console.log("Websocket connection closed");
//   }

//   connect(pair, streamHandler) {
//     return new Promise((resolve, reject) => {
//       this.channel = pair;
//       this.streamHandler = streamHandler;
//       this.ready = resolve;
//       this.error = reject;
//       super.open();
//     })
//   }

//   tickerHandler(args, kwargs) {
//     console.log('received ticker');
    
//     if(args) {
//       if (args[0] === this.pair) {
//         this.data.price.history.push(this.data.price.latest);
//         this.data.timestamp = Date.now();
//         this.data.price.latest = parseFloat(args[1]);
//         this.data.price.lowestAsk = parseFloat(args[2]);
//         this.data.price.highestBid = parseFloat(args[3]);
//         //this.data.price.change = parseFloat(args[4]),
//         this.data.volume.primary = parseFloat(args[5]);
//         this.data.volume.secondary = parseFloat(args[6]);
//         //this.data.price.isFrozen = args[7],
//         this.data.price.high24hr = parseFloat(args[8]);
//         this.data.price.low24hr = parseFloat(args[9]);

//         this.streamHandler([this.data]);
//       }
//     }
//   }

//   orderBookHandler(args, kwargs) {

//     console.log('received orderbook');
    
//     if (args) {

//       let {data, type} = args;

//       if (type === 'orderBookModify') {
//       }

//       if (type === 'orderBookRemove') {

//       }

//       if (type === 'newTrade') {

//       }
//       this.streamHandler([this.data]);
//     } 
//   }
// }


// new PoloniexFeedConnector().connect('BTC_ETH', (data) => {
//   console.log(data);
// })

//   .then((args) => {
//     console.log('done');
//   })

//   .catch((err) => {
//     console.log(err);
//   });

//module.exports = PoloniexFeedConnector;
