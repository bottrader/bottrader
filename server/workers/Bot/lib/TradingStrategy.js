const defaultConfig = require('./examples/example_strategy');


class TradingStrategy {
  constructor(config = defaultConfig) {
    this.config = config;
  }

  get name() { return this.config.details && this.config.details.name || ''; }
  get author() { return this.config.details && this.config.details.author || ''; }
  get email() { return this.config.details && this.config.details.email || ''; }
  get description() { return this.config.details && this.config.details.description || ''; }

  get defaults() { return this.config.defaults || {}; }
  set default(d) {
    for (k in d) {
      if (!this.config.defaults) {
        this.config.defaults = {};
      }
      this.config.defaults[k] = d[k];
    }
  }

  get thresholds() { return this.config.defaults && this.config.defaults.thresholds || {}; }
  set threshold(t) {
    for (k in t) {
      if (!this.config.defaults) {
        this.config.defaults = {};
      }
      this.config.defaults.thresholds[k] = t[k];
    }
  } 

  get indicators() { return this.config.defaults && this.config.defaults.indicators || []; }
  set indicator(i) {
    if (i instanceof Indicator) {
      this.config.defaults.indicators.push(i);
    }
  }

  get onWait() {
    if (this.config.handlers && this.config.handlers.onWait) {
      return this.config.handlers.onWait;
    } 
    throw new TypeError('Missing onWait handler function');
  }
  get onWatch() {
    if (this.config.handlers && this.config.handlers.onWatch) {
      return this.config.handlers.onWatch;
    } 
    throw new TypeError('Missing onWatch handler function');
  }


  get onLong() { 
    if (this.config.handlers && this.config.handlers.onLong) {
      return this.config.handlers.onLong;
    } else if (!this.config.handlers) {
      throw new TypeError('No trading handlers defined');
      return undefined;
    } else if (this.config.handlers.onTrade) {
      return this.config.handlers.onTrade;
    } else if (!(this.config.handlers.onLong || this.config.handlers.onShort || this.config.handlers.onTrade)) {
      throw new TypeError('Must define at least one of onLong, onShort or onTrade handler');
    } else {
      return undefined;
    }
  }

  get onShort() {
    if(this.config.handlers && this.config.handlers.onShort) {
      return this.config.handlers.onShort;
    }
    return this.onLong;
  }

  get onTrade() {
    if (this.config.handlers && this.config.handlers.onTrade) {
      return this.config.handlers.onTrade;
    } 
    return this.onLong;
  } 
}

module.exports = TradingStrategy;