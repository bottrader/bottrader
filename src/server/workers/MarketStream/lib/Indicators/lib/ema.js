var SMA = require('./sma');

//EMA Indicator Object Prototype
class EMA extends SMA {
  constructor( period ) {
    super(period);
    this.type = 'EMA';
    this.upateType = 'Price';
    this.SMA = new SMA(period);
    this.multiplier = 2 / (period + 1);
  }

  //EMA update function
  update (price) {
    var val = 0;

    //call SMA update until first SMA calculated
    if (!this.SMA.isValid) {
      this.SMA.update(price);
    }

    //case 1: no SMA -> Do nothing
    //case 2: SMA but no EMA -> Store SMA
    //case 3: EMA -> calc EMA and store EMA
    if (!this.SMA.isValid) return;

    //use SMA as first value if no EMA calculated
    if (this.SMA.isValid) {

      if(!this.isValid) {
        val = this.SMA.last;
        this.isValid = true;
      } else {
        //EMA = multiplier x (current price - last EMA) + last EMA
        val = this.multiplier * (price-this.last)+this.last;
      }
    }

    this.history.push(val);
    this.last = val;
  }
}

module.exports = EMA;
