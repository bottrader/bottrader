//const TradingStrategy = require('../strategy').TradingStrategy;
const Indicator = require('../../../MarketStream').Indicators.Indicator;
const TradingStrategy = require('../TradingStrategy');

class TestIndicator extends Indicator {
  constructor(attr, ...args) {
    super(...args);
    this.type = 'Test Indicator';
    this.updateType = 'price';
    this.specialAttribute = attr;
  }
}

var config = {

  details: {
    name:
      `test strategy`,

    author:
      `test author`,

    email:
      `test@email.com`,

    description:
      `This is a test strategy config`,
  },

  defaults: {

    indicators: [
      new TestIndicator('Hello'),
      new TestIndicator('Goodbye')
    ],
  },

  handlers: {

    onWait: (data, response, onWait) => {},
    onWatch: (data, response, onWatch) => {},
    onLong: (data, response, onLong) => {},
    onShort: (data, response, onShort) => {}
  }
}

strategy = new TradingStrategy(config);

console.log(`Testing Strategy....`);
console.log(`Strategy Name: ${strategy.name}`);
console.log(`Strategy Author: ${strategy.author}`);
console.log(`Strategy Email: ${strategy.email}`);
console.log(`Strategy Description: ${strategy.description}`);

console.log(`Strategy Defaults: `);
let defaults = strategy.defaults;
console.log(defaults);
console.log(`Strategy Thresholds: ${JSON.stringify(strategy.thresholds)}`);

console.log(`Strategy Indicators: `);
let indicators = strategy.indicators;
console.log(indicators);

console.log(`Strategy onWait Handler: ${strategy.onWait}`);
console.log(`Strategy onWatch Handler: ${strategy.onWatch}`);
console.log(`Strategy onLong Handler: ${strategy.onLong}`);
console.log(`Strategy onShort Handler: ${strategy.onShort}`); 
console.log(`Strategy onTrade Handler: ${strategy.onTrade}`);

console.log(`Testing Strategy with empty config....`);

config = {}

strategy = new TradingStrategy(config);

//should all fail gracefully
console.log(`Strategy Name: ${strategy.name}`);
console.log(`Strategy Author: ${strategy.author}`);
console.log(`Strategy Email: ${strategy.email}`);
console.log(`Strategy Description: ${strategy.description}`);

console.log(`Strategy Defaults: `);
defaults = strategy.defaults;
console.log(defaults);
console.log(`Strategy Thresholds: ${JSON.stringify(strategy.thresholds)}`);

console.log(`Strategy Indicators: `);
indicators = strategy.indicators;
console.log(indicators);

// should throw an error if handlers don't exist

try {
  console.log(`Strategy onWait Handler: ${strategy.onWait}`);
} catch (err) {
  console.error('Error: ', err.message);
}

try {
  console.log(`Strategy onWatch Handler: ${strategy.onWatch}`);
} catch (err) {
  console.error('Error: ', err.message);
}

try {
  console.log(`Strategy onLong Handler: ${strategy.onLong}`);
} catch (err) {
  console.error('Error: ', err.message);
}

try {
  console.log(`Strategy onShort Handler: ${strategy.onShort}`);
} catch (err) {
  console.error('Error: ', err.message);
}

try {
  console.log(`Strategy onTrade Handler: ${strategy.onTrade}`);
} catch (err) {
  console.error('Error: ', err.message);
}

config = {
  handlers: {
    onWait: (data, response, onWait) => { },
    onWatch: (data, response, onWatch) => { }
  }
}

strategy = new TradingStrategy(config);

try {
  console.log(`Strategy onLong Handler: ${strategy.onLong}`);
} catch (err) {
  console.error('Error: ', err.message);
}

try {
  console.log(`Strategy onShort Handler: ${strategy.onShort}`);
} catch (err) {
  console.error('Error: ', err.message);
}

try {
  console.log(`Strategy onTrade Handler: ${strategy.onTrade}`);
} catch (err) {
  console.error('Error: ', err.message);
}


console.log(`Testing Strategy with only onLong handler....`);

config = {
  handlers: {

    onWait: (data, response, onWait) => { },
    onWatch: (data, response, onWatch) => { },
    onLong: (data, response, onLong) => { },
  }  
}

strategy = new TradingStrategy(config);

//should handle gracefully and default onShort and onTrade to onLong handler

console.log(`Strategy onWait Handler: ${strategy.onWait}`);
console.log(`Strategy onWatch Handler: ${strategy.onWatch}`);
console.log(`Strategy onLong Handler: ${strategy.onLong}`);
console.log(`Strategy onShort Handler: ${strategy.onShort}`);
console.log(`Strategy onTrade Handler: ${strategy.onTrade}`);


console.log(`Testing Strategy with only onTrade handler....`);

config = {
  handlers: {

    onWait: (data, response, onWait) => { },
    onWatch: (data, response, onWatch) => { },
    onTrade: (data, response, onTrade) => { },
  }
}

strategy = new TradingStrategy(config);

//should handle gracefully and default onShort and onTrade to onLong handler

console.log(`Strategy onWait Handler: ${strategy.onWait}`);
console.log(`Strategy onWatch Handler: ${strategy.onWatch}`);
console.log(`Strategy onLong Handler: ${strategy.onLong}`);
console.log(`Strategy onShort Handler: ${strategy.onShort}`);
console.log(`Strategy onTrade Handler: ${strategy.onTrade}`);