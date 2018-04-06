/*Oscillators: This is a group of indicators that flow up and down, often
between upper and lower bounds. Popular oscillators include the RSI,
Stochastics, Commodity Channel Index (CCI) and MACD.*/

/*Volume: Aside from basic volume, there are also volume indicators. These
typically combine volume with price data in an attempt to determine how
strong a price trend is. Popular volume indicators include Volume (plain),
Chaikin Money Flow, On Balance Volume and Money Flow.*/

/*Overlays: These are indicators that overlap the price movement, unlike a
MACD indicator for instance which is separate from the price chart. With o
verlays you may choose to use more than one, since their functions are so
varied. Popular overlays include Bollinger Bands, Keltner Channels, Parabolic
SAR, Moving Averages, Pivot Points and Fibonacci Extensions and Retracements.*/

/*Breadth Indicators: This group includes any indicators that has to do with
trader sentiment or what the broader market is doing. These are mostly stock
market related, and include Trin, Ticks, Tiki and the Advance-Decline Line.*/

//Top Level Indicator Object Prototype
class Indicator {
  constructor() {
    this.type = 'none'; // 'EMA', 'SMA', 'ParabolicSAR'
    this.updateType = 'undefined'; // 'Price', 'Candelstick'
    this.isValid = false;
    this.data = []; //store past [period] no of prices
    this.history = []; //store past MA values
    this.last = 0; //store last calculated MA
  }

  update() { return };
  oninit() { return };
  reset() { return };

  
}

module.exports = Indicator;
