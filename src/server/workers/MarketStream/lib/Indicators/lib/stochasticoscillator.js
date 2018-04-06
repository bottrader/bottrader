const Indicator = require('./indicators');

class StochasticOscillator extends Indicator {
  constructor(p1, p2, p3, ...args) {
    super(...args);
    this.p = [p1, p2, p3];
    this.type = 'Stochastic Oscillator';
    this.upateType = 'Price';
  }
}

module.exports = StochasticOscillator;