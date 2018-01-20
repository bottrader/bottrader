// Import Indicators
const {Ema, Psar, StochasticOscillator, Indicator} = require('../../../MarketStream').Indicators;
const {HeikenAshi} = require('../../../MarketStream').Candles;

// Import Orders
const {BuyOrder, SellOrder, OrderType} = require('../Order');

// Import helper functions
var _ = require('underscore');


var defaultConfig = {

  details: {
    name:
      `crypto-heiken-stoch`,

    author:
      `Mike Sutherland`,

    email:
      `mjfsutherland@gmail.com`,

    description:
      `This strategy works well for crypto exchanges with high volume currency pairs`,
  },

  defaults: {

    indicators: [
      new StochasticOscillator(14, 7, 3),
      new HeikenAshi(5),
    ],
  },

  handlers: {

    onWait: (data, response) => {
      let {stream} = data;

      if (stream.volume.average.normalized > 0.7) {
        response.enterTrading();
        return;
      }

      return;
    },

    onWatch: (data, response) => {
      let { stream } = data;

      if (stream.volume.average.normalized < 0.5) {
        response.exitTrading();
        return;
      }

      let candleshist = stream.candles.heikenashi[5].slice(-7, -2);

      //check for 5 candles trending in a row up or down
      let trend = _(candleshist).every(candle => (
        candle.direction === candlehist[0].direction
      ));

      if (trend) {
        //check for 2 completed candles trending in opposite direction
        let candleslast = stream.candles.heikenashi[5].slice(-2);

        let reversal = _(candleslast).every(candle => (
          candle.direction !== candlehist[0].direction
        ));

        let direction = candlelast[0].direction;

        if (reversal) {
          // bull reversal
          if ((direction === 1) && (stream.indicators.stochasticoscillator < 30)) {

            //create market limit order
            let order = new BuyOrder().makeLimitOrder(stream.price.current);

            //set stop loss
            order.stopLoss = candleslast[1].low;

            //set Target based on Risk Reward Ratio
            order.riskRewardRatio = 3;

            response.placeOrder(order);
            return;

            // bear reversal
          } else if ((direction === -1) && (stream.indicators.stochasticoscillator > 70)) {

            //create market limit order
            let order = new SellOrder().makeLimitOrder(stream.price.current);

            //set stop loss
            order.stopLoss = candleslast[1].high;

            //set Target based on Risk Reward Ratio
            order.riskRewardRatio = 3;

            response.placeOrder(order);
            return;
          }
        }
      }
    },

    onLong: (data, response) => {
      let { stream, order } = data;

      let candleslast = stream.candles.heikenashi[5].slice(-2);

      let reversal = _(candleslast).every(candle => (
        candle.direction === -1
      ));

      if (reversal) {

        response.exitOrder(order);

      } else {

        if ((stream.price.current - order.orderPrice) > (order.orderPrice - order.stopLoss)) {
          order.stopLoss = order.orderPrice;
        }

        if ((order.price.target - stream.price.current) < (stream.price.current - order.stopLoss)) {
          order.target += order.target - order.orderPrice;
        }

      }
    },

    onShort: (data, response) => {
      let { stream, order } = data;

      let candleslast = stream.candles.heikenashi[5].slice(-2);


      let reversal = _(candleslast).every(candle => (
        candle.direction === 1
      ));

      if (reversal) {
        response.exitOrder(order);
      }
    }
  }
}

module.exports = defaultConfig;