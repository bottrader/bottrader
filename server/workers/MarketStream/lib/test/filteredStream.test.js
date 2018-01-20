const FilteredStream = require('../FilteredStream');

//const TradingStrategy = require('../strategy').TradingStrategy;
const {Indicator} = require('../Indicators');
const {Candle} = require('../Candles');

class TestIndicator extends Indicator {
  constructor(attr, ...args) {
    super(...args);
    this.type = 'Test Indicator';
    this.updateType = 'candle';
    this.specialAttribute = attr;
    this.update.bind(this);
  }

  update(stream) {
    stream[this.specialAttribute] = this.specialAttribute;
    return stream;
  }
}

class TestCandle extends Candle {
  constructor(attr, ...args) {
    super(...args);
    this.type = 'Test Candle';
    this.updateType = 'price';
    this.specialAttribute = attr;
    this.update.bind(this);
  }

  update(stream) {
    stream[this.specialAttribute] = this.specialAttribute;
    return stream;
  }
}

var indicators = [
  new TestIndicator('1'),
  new TestIndicator('2'),
  new TestCandle('3'),
  new TestCandle('4'),
  new TestIndicator('5'),
  new TestCandle('6')
];

var testHandler = {
  update: function(stream) {
    console.log(stream);
  }
}

var filteredStream = new FilteredStream();

filteredStream.use(indicators);
filteredStream.use(testHandler);

filteredStream.streamHandler([{price: 1000}]);