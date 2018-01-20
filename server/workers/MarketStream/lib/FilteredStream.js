const { Indicator } = require('./Indicators');
const { Candle } = require('./Candles');

class FilteredStream {
  constructor() {
    this.candles = [];
    this.indicators = [];
    this.handlers = [];
  }  

  streamHandler(args) {
    let [data] = args;

    if (this.candles) {
      data = this.candles.reduce((data, candle) => {
        return candle.update.call(candle, data);

      }, data);
    }

    if (this.indicators) {
      data = this.indicators.reduce((data, indicator) => {
        return indicator.update.call(indicator, data);

      }, data);
    }

    data = this.handlers.reduce((data, handler) => {
      return handler.update.call(handler, data);
    }, data);
  }

  use(handlers) {

    if (!Array.isArray(handlers)) {
      handlers = [handlers];
    }

    handlers.forEach((handler) => {
      if (handler instanceof Candle) {
        this.candles.push(handler);
      } else if (handler instanceof Indicator) {
        this.indicators.push(handler);
      } else {
        this.handlers.push(handler);
      }
    })
  }
}

module.exports = FilteredStream;