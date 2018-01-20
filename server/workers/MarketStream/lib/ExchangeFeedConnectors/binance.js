const WebSocket = require('ws');

class BinanceFeedConnector {
  constructor() {

    this.data = {
      symbol: '',
      timestamp: 0,
      price: {
        latest: 0,
        history: []
      },
      orders: {
        latest: {
          price: 0,
          time: 0,
          quantity: 0,
        },
        history: []
      },
      volume: {
        latest: 0,
        history: []
      },
      orderBook: {
        bids: {},
        asks: {}
      }
    };
  }

  onopen() {
    if (!this.streamHandler) {
      this.error(new ReferenceError('streamHandler has not been set yet'));
      return;
    }
    console.log('Session opened');
    this.ready();
  }

  onclose() {
    console.log("Websocket connection closed");
    this.error(new Error('Connection with Binance has been closed'));
  }

  connect(pair, streamHandler) {
    return new Promise((resolve, reject) => {
      this.channel = pair.toLowerCase();
      this.streamHandler = streamHandler;
      this.ready = resolve;
      this.error = reject;

      const wsDepth = new WebSocket(`wss://stream.binance.com:9443/ws/${this.channel}@depth`);
      const wsKline = new WebSocket(`wss://stream.binance.com:9443/ws/${this.channel}@kline_1m`);
      const wsTrade = new WebSocket(`wss://stream.binance.com:9443/ws/${this.channel}@aggTrade`);

      wsDepth.on('open', this.onopen.bind(this));
      wsDepth.on('message', this.onOrderBook.bind(this));
      wsKline.on('open', this.onopen.bind(this));
      wsKline.on('message', this.onKline.bind(this));
      wsTrade.on('open', this.onopen.bind(this));
      wsTrade.on('message', this.onTrade.bind(this));
    })
  }

//   {
//   "e": "depthUpdate",			// event type
//   "E": 1499404630606, 		  // event time
//   "s": "ETHBTC", 				  // symbol
//   "u": 7913455, 					  // updateId to sync up with updateid in /api/v1/depth
//   "b": [									  // bid depth delta
//          [
//            "0.10376590", 	// price (need to upate the quantity on this price)
//            "59.15767010", 	// quantity
//            []						  // can be ignored
//          ],
//        ],
//   "a": [									  // ask depth delta
//          [
//            "0.10376586", 	// price (need to upate the quantity on this price)
//            "159.15767010", // quantity
//            []							// can be ignored
//          ],
//          [
//            "0.10383109",
//            "345.86845230",
//            []
//          ],
//          [
//            "0.10490700",
//            "0.00000000", 	//quantitiy=0 means remove this level
//            []
//          ]
//        ]
// }

  onOrderBook(data) {
    console.log('Received Depth Packet');

   // this.streamHandler([this.data]);
  }


// {
// 	"e": "kline",							  // event type
// 	"E": 1499404907056,				  // event time
// 	"s": "ETHBTC",						  // symbol
// 	"k": {
// 		"t": 1499404860000, 		  // start time of this bar
// 		"T": 1499404919999, 		  // end time of this bar
// 		"s": "ETHBTC",					  // symbol
// 		"i": "1m",							  // interval
// 		"f": 77462,							  // first trade id
// 		"L": 77465,							  // last trade id
// 		"o": "0.10278577",			  // open
// 		"c": "0.10278645",			  // close
// 		"h": "0.10278712",			  // high
// 		"l": "0.10278518",			  // low
// 		"v": "17.47929838",			  // volume
// 		"n": 4,								    // number of trades
// 		"x": false,							  // whether this bar is final
// 		"q": "1.79662878",			  // quote volume
// 		"V": "2.34879839",			  // volume of active buy
// 		"Q": "0.24142166",			  // quote volume of active buy
// 		"B": "13279784.01349473"  // can be ignored
// 		}
// }

  onKline(data) {

    console.log('Received Kline Packet');
    
    //symbol
    this.data.symbol = data.s;

    //timestamp
    this.data.timestamp = data.E;
 
    //this.streamHandler([this.data]);
  }


// {
// 	"e": "aggTrade",		// event type
// 	"E": 1499405254326,	// event time
// 	"s": "ETHBTC",			// symbol
// 	"a": 70232,				  // aggregated tradeid
// 	"p": "0.10281118",	// price
// 	"q": "8.15632997",	// quantity
// 	"f": 77489,				  // first breakdown trade id
// 	"l": 77489,				  // last breakdown trade id
// 	"T": 1499405254324,	// trade time
// 	"m": false,				  // whehter buyer is a maker
// 	"M": true				    // can be ignore
// }


  onTrade(data) {
    console.log('Received Trade Packet');

    //symbol
    this.data.symbol = data.s;
    
    //timestamp
    this.data.timestamp = data.E;
    
    //price
    this.data.price.history.push(this.data.price.latest);
    this.data.price.latest = parseFloat(data.p);

    //volume

    //orders
    this.data.orders.history.push(this.data.orders.latest);
    this.data.orders.latest.price = parseFloat(data.p);
    this.data.orders.latest.time = data.T;
    this.data.orders.latest.quantity = parseFloat(data.q);
    this.data.orders.latest.isMaker = data.M;

    //orderBook

    this.streamHandler([this.data]);
  }
}

new BinanceFeedConnector().connect('ETHBTC', (data) => {
  console.log(data);
})
  .then(() => {
    console.log('Successfully connected to Binance API');
  })

  .catch((err) => {
    console.log(err.message);
  });

