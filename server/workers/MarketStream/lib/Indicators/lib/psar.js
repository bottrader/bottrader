var Indicator = require('./indicators');
var _ = require('underscore');


//Parabolic SAR Object Prototype
class PSAR extends Indicator {
  constructor( AF, MAXAF ) {
    super();
    this.type = 'Parabolic SAR';
    this.upateType = 'Candelstick';
    this.MAXAF    = MAXAF  || 0.20;
    this.AF       = AF     || 0.02;
  }
  // 1: orders are rising
  // -1: orders are declining
  // +1/-1 change: SAR was hit by today's price action causing a reversal
  updateDirection( l1, c0, SAR ) {
    // orders are declining

    if (l1.DIR > 0) {
      return (c0.low > SAR) ? 1 : -1;
    // orders are rising
    } else {
      return (c0.high < SAR) ? -1 : 1;
    }
  }


  updateEP( l1, c0 ) {
    if (l1.DIR > 0) {
      return (c0.high > l1.EP) ? c0.high : l1.EP;
    } else {
      return (c0.low < l1.EP) ? c0.low : l1.EP;
    }
  }

  updateEPSAR( SAR, EP ) {
    return EP - SAR;
  }

  updateSAR( l1, l2, c1, c2 ) {
    if (l1.DIR === l2.DIR) {
      if (l1.DIR > 0) {
        if ((l1.SAR + l1.AFDIFF) < Math.min(c1.low,c2.low)) {
          return l1.SAR + l1.AFDIFF;
        } else {
          return Math.min(c1.low,c2.low);
        }
      } else {
        if ((l1.SAR + l1.AFDIFF) > Math.max(c1.high,c2.high)) {
          return l1.SAR + l1.AFDIFF;
        } else {
          return Math.max(c1.high,c2.high);
        }
      }
    } else {
      return l1.EP;
    }
  }

  updateAF(l1, DIR, EP) {
    if (DIR === l1.DIR) {
        if (DIR > 0) {
          if (EP > l1.EP) {
            return (l1.AF === this.MAXAF) ? l1.AF : (this.AF + l1.AF);
          } else {
            return l1.AF;
          }
        } else {
          if (EP < l1.EP) {
            return (l1.AF === this.MAXAF) ? l1.AF : (this.AF + l1.AF);
          } else {
            return l1.AF;
          }
        }
    } else {
      return this.AF;
    }
  }

  updateAFDiff( AF, EPSAR) {
    return AF * EPSAR;
  }

  updateDeltaSAR( l1, SAR ) {
    return (SAR/l1.SAR) - 1;
  }

  update (candelstick) {
    //Previous SAR = The SAR value for the previous period.
    //add latest candelstick to local price history
    this.data.push(candelstick);

    if( this.data.length > 5 ) {

      var l1 = this.history[this.history.length-1];
      var l2 = this.history[this.history.length-2];
      var c0 = this.data[this.data.length-1];
      var c1 = this.data[this.data.length-2];
      var c2 = this.data[this.data.length-3];

      var l0 = {};

      l0['SAR']      = this.updateSAR(l1, l2, c1, c2);
      l0['EP']       = this.updateEP(l1, c0);
      l0['DIR']      = this.updateDirection(l1, c0, l0.SAR);
      l0['EPSAR']    = this.updateEPSAR(l0.SAR, l0.EP);
      l0['AF']       = this.updateAF(l1, l0.DIR, l0.EP);
      l0['AFDIFF']   = this.updateAFDiff(l0.AF, l0.EPSAR);
      l0['DELTASAR'] = this.updateDeltaSAR(l1, l0.SAR);

      this.history.push(l0);
      this.last = l0.SAR;

    } else {

      if( this.data.length == 4) {

        var l0 = {};

        l0['SAR']      = 0;
        l0['EP']       = 0;
        l0['DIR']      = 1;
        l0['EPSAR']    = 0;
        l0['AF']       = 0;
        l0['AFDIFF']   = 0;
        l0['DELTASAR'] = 0;

        this.history.push(l0);

      }

      if (this.data.length == 5) {

        var l1 = this.history[this.history.length-1];
        var c0 = this.data[this.data.length-1];
        var l0 = {};

        var data = this.data.slice(-5);

        // return minimum value from last 5 period candelsticks
        l0['SAR']      = _.reduce(data,function(memo, object) {
                          return Math.min(memo, object.open, object.high, object.low, object.close);
                        },data[0].low);

        // return maximum value from last 5 period candelsticks
        l0['EP']      = _.reduce(data,function(memo, object) {
                          return Math.max(memo, object.open, object.high, object.low, object.close);
                        },data[0].high);

        l0['DIR']      = this.updateDirection(l1, c0, l0.SAR);
        l0['EPSAR']    = this.updateEPSAR(l0.SAR, l0.EP);
        l0['AF']       = this.updateAF(l1, l0.DIR, l0.EP);
        l0['AFDIFF']   = this.updateAFDiff(l0.AF, l0.EPSAR);
        l0['DELTASAR'] = 0;

        this.history.push(l0);
        this.isValid = true;
        this.last = l0.SAR;
      }
    }
  }
}


//Extreme Point (EP) = The highest high of the current uptrend or the lowest low of the current downtrend.
//Acceleration Factor (AF) = Determines the sensitivity of the SAR.
//AF starts at .02 and increases by .02 every time the EP rises in a Rising SAR or EP falls in a Falling SAR.

//The calculations for Rising Parabolic SAR and Falling Parabolic SAR are different so they will be separated.

//Rising Parabolic SAR
//Previous SAR + Previous AF(Previous EP + Previous SAR) = Current SAR

//Falling Parabolic SAR
//Previous SAR - Previous AF(Previous SAR - Previous EP) = Current SAR*/


//For each step in a trend, the SAR value is calculated one period before. In other words, today’s value is calculated from yesterday’s data. The formula consists of the following steps:

//“SAR+1” = “SAR” + A (“EP” – “SAR”) where
//“SAR” and “SAR+1” are today’s and tomorrow’s SAR values;
//“EP”, or Extreme Point, equals the highest price point during an uptrend, or the lowest price point in a downtrend, and is updated if a new “max” or “min” is observed;
//“A” is the acceleration factor. In forex, it is set to start at “0.02”. It is raised by a similar amount every time a new EP record is recorded. As “A” increases, the SAR converges towards the price of the currency. A maximum value is also set, typically “0.20”.
//There are also “boundary” considerations that modify the SAR in case the iterative calculation produces a value outside of the general form.
//There are also additional rules that apply when a trend suddenly switches. EP and A values are reset, and the process starts all over again.

module.exports = PSAR;
