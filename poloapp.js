var Market = require('./MarketData');
var market = new Market();

var EMA = require('./MarketData').EMA;
var PSAR = require('./MarketData').PSAR;

class Bot {
  constructor(strategy, market, asset) {
    console.log(market);
    this.strategy = strategy;
    this.market = market;
    this.asset = asset;
  }

  init() {

    market.connect(this.market, this.asset);

    market.use(new EMA(10));
    market.use(new EMA(50));
    market.use(new EMA(100));
    //market.use(new PSAR(0.02, 0.2));
    market.on('1M', this.onCandle);
  }

  onTick(data) {
    console.log('Price Tick', data);
  }
  
  onCandle(data) {
    console.log('1M Tick', data);
  }
}

new Bot(null, 'Poloniex', 'BTC_ETH').init();



