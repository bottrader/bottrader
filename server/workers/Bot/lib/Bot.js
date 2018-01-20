const StateMachine = require('javascript-state-machine');
const FilteredStream = require('../../MarketStream').FilteredStream;
const {BuyOrder, SellOrder, OrderType} = require('./Order');
const TradingStrategy = require('./TradingStrategy');

class Response {
  constructor() {
    this._engage = false;
    this._disengage = false;
    this._error = false;
    this._exit = false;
    this._order = false;
  }
  enterPosition(o) {
    if (o instanceof BuyOrder || o instanceof SellOrder) {
      this._order = o;
    } else {
      throw new TypeError('order should be instance of Order');
    }
  }

  updatePosition(o) {
    this._order = o;
  }

  exitPosition(o) {
    this._order = o;
    this._exit = true;
  }

  enterTrading() { this._engage = true; }
  exitTrading() { this._disengage = true; }
  reportError(err) { this._error = err; }

  get engage() { return this._engage; }
  get disengage() { return this._disengage; }
  get error() { return this._error; }
  get order() { return this._order; }
  get exit() { return this._exit; }

}

class Bot {
  constructor (id, asset, marketStream, tradeAccount, strategy = new TradingStrategy()) {

    this.id = id;
    this.marketStream = marketStream;
    this.tradeAccount = tradeAccount;

    // set up IPC message handlers
    process.on('message', this.onServerMessage.bind(this));
    process.on('disconnect', this.onDisconnect.bind(this));

    // set up StateMachine
    this.sm = new StateMachine({
      init: 'init',
      transitions: [
        { name: 'start', from: 'init', to: 'waiting' },              
        { name: 'engage', from: 'waiting', to: 'watching' },
        { name: 'disengage', from: 'watching', to: 'waiting' },
        { name: 'buy', from: 'watching', to: 'trading' }, 
        { name: 'sell', from: 'watching', to: 'trading' },             
        { name: 'exit', from: 'trading', to: 'housekeeping' },
        { name: 'ready', from: 'housekeeping', to: 'watching' },
        { name: 'bigredbutton', from: '*', to: 'shutdown' },
        { name: 'reset', from: 'shutdown', to: 'init' }
      ],
      methods: {
        onBeforeBuy: this.prepareBuyOrder,
        onBeforeSell: this.prepareSellOrder,
      }
    });

    // set up internal state handler routing table
    this.handlers = {
      'init' : this.init.bind(this),
      'waiting' : this.waiting.bind(this),
      'watching' : this.watching.bind(this),
      'trading' : this.trading.bind(this),
      'housekeeping' : this.housekeeping.bind(this),
      'shutdown' : this.shutdown.bind(this)
    };

    // check for valid Strategy
    if (strategy instanceof TradingStrategy) {
      this.strategy = strategy;
    } else {
      throw new TypeError('Strategy must be an instance of TradingStrategy');
      this.sm.bigredbutton();
    }

    // check for MarketStream
    if (!this.marketStream) {
      throw new TypeError('No MarketStream provided');
      this.sm.bigredbutton();
    }

    // check for Trade Account 
    if (!this.tradeAccount) {
      throw new TypeError('No TradeAccount provided');
      this.sm.bigredbutton();
    }

    // set up filtered stream to process requested Candles and Indicators 
    this.filteredStream = new FilteredStream();
    this.filteredStream.use(this.strategy.indicators);
    this.filteredStream.use(this);

    // open up the Market Stream
    marketStream.open(this.filteredStream.streamHandler.bind(this.filteredStream))

      .then(() => {
        this.sm.start();
      })

      .catch(err => {
        this.sm.bigredbutton(err);
      });
  }

  // State Handlers

  init(stream) {

    console.log('Init State');

  }

  waiting(stream) {

    let response = new Response();
    this.strategy.onWait({stream: stream}, response);

    if (response.engage) {
      this.sm.engage();
      return;
    }
  }

  watching(stream) {
    // no market activity

    let response = new Response();
    this.strategy.onWatch({stream: stream}, response);
    
    if (response.disengage) {
      this.sm.disengage();
      return;
    }

    if (response.order) {
      let order = response.order;
      this.position = order;

      if (!order.orderPrice) {
        order._orderPrice = stream.price;
      }

      let _bot = this;
      this.tradeAccount.details()

        .then((details) => {
          console.log('Available funds: ', details);
          order.accountSize = details.size;

          order.risk = 0.02;
          console.log('Setting Risk at 0.02, Order quantity is: ', order.quantity)
          console.log('Minimum order quantity is: ', details.minQuantity);

          if (order.quantity > details.minQuantity) {
            console.log('Requesting Order from Trade Account');
            return _bot.tradeAccount.requestOrder(order);
          }

          return false;
        })

        .then((success) => {
          if (success) {
            console.log('Order completed successfully');
            if (order.isBuyOrder) {
              console.log('Moving to Trade: buy');
              _bot.sm.buy();
            } else if (order.isSellOrder) {
              console.log('Moving to Trade: sell');              
              _bot.sm.sell();
            }
          }
        })

        .catch((err) => {
          throw err;
          _bot.sm.bigredbutton(err);
        });        
    }

    if (response.error) {
      this.sm.bigredbutton(response.error);
      return;
    }
  }

  trading(stream) {

    let response = new Response();
    
    let data = {
      stream: stream,
      order: this.position
    }

    this.strategy.onTrade(data, response);

    if (response.exit) {

      console.log('Exiting Position');

      this.tradeAccount.requestOrder()
          
        .then((success) => {
          console.log('Position exited successfully');
          if (success) {
            this.sm.exit();
          } 
        })

        .catch((err) => {
          this.sm.bigredbutton(err);
        });
    }

    if (response.error) {
      this.sm.bigredbutton(response.error);
      return;
    }
  }

  housekeeping(stream) {
    console.log('Cleaning up');
    //when ready
    this.sm.ready();
  }

  shutdown(stream) {
    this.sm.reset();
  }

  // Marketstream Handler

  update(data) {
    this.handlers[this.sm.state](data);
  }

  prepareBuyOrder(lifecycle, ...args) {
    console.log(`Preparing to make Buy Order`);
  }

  prepareSellOrder(lifecycle, ...args) {
    console.log(`Preparing to make Sell Order`);
  }

  addReporter(callback) {
    this.sm.observe('onTrasition', (lifecycle, ...args) => {
      callback(lifecycle.transition, this, args);
    });
  }
}

onServerMessage(message) {
  console.log('Message received from Server: ', message);
}

onDisconnect() {
  console.log('Disconnect received from Server');
}

module.exports = Bot;

/*
response = new Response();
console.log('Resonse.engage: ', response.engage);
console.log('Resonse.disengage: ', response.disengage);
console.log('Resonse.error: ', response.error);
console.log('Resonse.order: ', response.order);
console.log('Resonse.exit: ', response.exit);
response.enterTrading();
console.log('Resonse.engage: ', response.engage);
response.exitTrading();
console.log('Resonse.disengage: ', response.disengage);
response.reportError(new Error('Test Error'));
console.log('Response.error: ', response.error);
response.placeOrder(new BuyOrder());
console.log('Resonse.order: ', response.order);
console.log('Resonse.order.orderType: ', response.order.orderType);
response.order.makeLimitOrder(1000);
response.updateOrder(response.order);
console.log('Resonse.order: ', response.order);
console.log('Resonse.order.orderType: ', response.order.orderType);
response.exitPosition(response.order);
console.log('Resonse.exit: ', response.exit);
console.log('Resonse.order: ', response.order);
console.log('Resonse.order.orderType: ', response.order.orderType);
*/
