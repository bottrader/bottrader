class Candle {
  constructor(interval) {
    this.type = 'Candlestick'; // 'EMA', 'SMA', 'ParabolicSAR'
    this.updateType = 'Candlestick'; // 'Price', 'Candlestick'
    this.startTime = 0;
    this.endTime = 0;
    this.interval = interval;
    this.params = this.interval;
    this.open;
    this.close;
    this.high;
    this.low;
    this.volume;
    this.data = []; //store past [period] no of prices
    this.history = []; //store past MA values
    this.last = 0; //store last calculated MA
  }

  update(data) { 

    data[this.type] = data[this.type] || [];
    data[this.type][this.interval] = data[this.type][this.interval] || {};

    // check if cross the interval boundary
    if (data.timestamp > this.endTime) {

      this.history.push({
        open: this.open,
        close: this.close,
        high: this.high,
        low: this.low,
        volume: this.volume,
        start: this.start,
        end: this.end
      });

      let {start, end} = this.nextCandleTimes(data.timestamp, this.interval);
      this.start = start;
      this.end = end;
      console.log(`New Candle Forming at ${data.timestamp} - Start: ${start} End: ${end}`);

      this.open = data.price.latest;
      this.close = data.price.latest;
      this.low = data.price.latest;
      this.high = data.price.latest;
      this.volume = data.volume.latest;
    } else {

      this.close = data.price.latest;
      this.low = data.price.latest < this.low ? data.price.latest : this.low;
      this.high = data.price.latest > this.high ? data.price.latest : this.high;
      this.volume = data.volume.latest;
    }

    data[this.type][this.interval].open = this.open; 
    data[this.type][this.interval].close = this.close; 
    data[this.type][this.interval].low = this.low; 
    data[this.type][this.interval].high = this.high; 
    data[this.type][this.interval].volume = this.volume; 
    data[this.type][this.interval].start = this.start; 
    data[this.type][this.interval].end = this.end; 

    return data;
  };

  nextCandleTimes(time, interval) {
    let toMilli = {
      'm': 1000 * 60,
      'h': 1000 * 60 * 60,
      'd': 1000 * 60 * 60 * 24,
      'w': 1000 * 60 * 60 * 24 * 7,
      'M': 1000 * 60 * 60 * 24 * 365 / 12
    }
    let [all, period, units ] = /^([0-9]+)([mdhwM]+)$/.exec(interval);
    let milli = parseInt(period) * toMilli[units];
    let start = Math.round(time / milli) * milli;

    return {
      start: start,
      end: start + milli
    }
  }

  oninit() { return };
  reset() { return };
}

module.exports = Candle;