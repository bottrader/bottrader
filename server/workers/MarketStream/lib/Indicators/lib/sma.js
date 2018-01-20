var MA = require('./ma');

//SMA Indicator Object Prototype
class SMA extends MA {
  constructor( period ) {
    super(period);
    this.type = 'SMA'
    this.upateType = 'Price';

  }

  //SMA update function
  update (price) {
    var val = 0;

    //add latest price to local price history
    this.data.push(price);

    //only store last [period] price values
    if (this.data.length > this.period) {
      this.data.shift();
    }

    //check there is enough data to calculate an SMAs
    if (this.period <= this.data.length) {
      for (var i = this.data.length-1; i >= 0; i--) {
        val += this.data[i];
      }
      val = val/this.period;
      this.history.push(val);
      this.last = val;
      this.isValid = true;
    }
  }
}

module.exports = SMA;
