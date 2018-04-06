const Bot = require('../Bot');
const reporter = require('../examples/example_reporter');
const {BuyOrder, SellOrder} = require('../Order');

const Indicator = require('../../../MarketStream').Indicators.Indicator;
const TradingStrategy = require('../TradingStrategy');

class TestIndicator extends Indicator {
  constructor(attr, ...args) {
    super(...args);
    this.type = 'Test';
    this.param = attr;
    this.updateType = 'price';
    this.specialAttribute = attr;
  }

  update(data) {
    return Math.floor(Math.random() * 100);
  }
}

var config = {
  defaults: {
    indicators: [
      new TestIndicator(40),
      new TestIndicator(60)
    ],
  },
  handlers: {
    onWait: (data, res) => {
      console.log('onWait....');
      console.log(JSON.stringify(data.stream));

      let {stream} = data;


      if (stream.Test[40] > 50) {
        res.enterTrading();
      }

     },
    onWatch: (data, res) => {
      console.log('onWatch....');
      console.log(JSON.stringify(data.stream));

      let {stream} = data;

      if (stream.Test[60] > 80) {
        console.log('Placing Buy Order ...');
        let order = new BuyOrder()
        order.stopLoss = stream.price - 50;
        res.enterPosition(order);
        return;
      }

      if (stream.Test[40] < 20) {
        res.exitTrading();
        return;
      }      

    },

    onLong: (data, res) => {
      console.log('onLong....');
      console.log(JSON.stringify(data.stream));
      

      let {stream, order} = data;

      if (stream.Test[60] > 60) {
        console.log('Converting to Limit order at 1000')
        order.makeLimitOrder(1000);
        res.updatePosition(order);
        return;
      }

      if (stream.Test[40] < 40) {
        console.log('Selling out of position');
        res.exitPosition(order);
        return;
      }
    }
  }
}

class MarketStream {
  constructor() {
  }

  open(streamHandler) {
    return new Promise((resolve, reject) => {
      this.streamHandler = streamHandler;

      setInterval(() => {
        this.streamHandler([{
          price: Math.floor(Math.random() * 1000)
        }]);
      }, 500);

      resolve();
    })
  }
}

class TradeAccount {
  constructor() {

  }
  details() {
    return new Promise((resolve, reject) => {
      resolve({
        size: 40000,
        minQuantity: 5
      });
      return
      reject();
    })
  }

  requestOrder(order) {
    return new Promise((resolve, reject) => {
      resolve(true);
      return;

      reject();
    })
  }
}

let strategy = new TradingStrategy(config);
let marketStream = new MarketStream();
let tradeAccount = new TradeAccount();

function testreporter(transition, bot, args) {
  console.log(transition);
}

try {
  let bot = new Bot(1, 'BTCETH', marketStream, tradeAccount, strategy);
  bot.addReporter(testreporter);

} catch(err) {
  console.error(err);
}
