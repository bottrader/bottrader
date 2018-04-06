import { Error } from '../../../../../../../../../Library/Caches/typescript/2.6/node_modules/@types/autobahn';

const cp = require('child_process');
const __workersdir = `Users/`

exchangeHandlers = {
  'poloniex': handler
}

class MarketConnector {
  constructor(exchange) {
    if (exchangeHandlers[exchange]) {
      this._exchangeHandler = exchangeConnectors[exchange];
      this._exchange = exchange;
    } else {
      throw new TypeError('No Handler available for selected exchange, call exchanges() for list of available exchange Connectors');
    }
    cp.fork(`${ __workersdir}/MarketStream/lib/MarketStream.js`)
  }

  get exchange() {
    return this._exchange; 
  }

  get marketAccount() {
    if (this._exchangeHandler && this._exchangeHandler.connected) {
      return
    }
  }

  connect() {
    return this.exchangeHandler.connect();
  }

  exchanges() {
    let exchanges = [];

    for (key in exchangeHandlers) {
      exchanges.push(key);
    }

    return exchanges;
  }
}