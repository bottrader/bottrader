var Indicator = require('./indicators');

//General Moving Average Object Prototype
class MA extends Indicator {
  constructor( period ) {
    super();
    this.period = period; //number of periods to calc MA
  }
}

module.exports = MA;
