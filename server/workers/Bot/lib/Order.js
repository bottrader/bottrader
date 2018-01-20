OrderType = {
  1: 'market',
  2: 'limit',
  3: 'stop'
};

OrderMap = {
  'market': 1,
  'limit': 2,
  'stop': 3
}


class Order {

  constructor() {
    this._orderType = OrderMap.market;
    this._isBuyOrder = true;
  }

  makeLimitOrder(price) {
    this._orderType = OrderMap.limit;
    this._orderPrice = price;
  }

  makeMarketOrder() {
    this._orderType = OrderMap.market;
  }

  makeStopOrder(price) {
    this.orderType = OrderMap.stop;
    this.orderPrice = price;
  }

  // allow updating target and stop (e.g. trailing stop)
  set target(p) { 
    this._orderUpdated = true;
    this._target = p; 
  }
  set stopLoss(p) { 
    this._orderUpdated = true;
    this._stopLoss = p; 
  }

  set orderUpdated(b) { this._orderUpdated = b; }  
  set accountSize(size) { this._accountSize = size; }
  
  set risk(p) {
    let { _accountSize = NaN, _orderPrice = NaN, _stopLoss = NaN } = this;

    if (!_accountSize) { throw new TypeError('Account Size has not been set'); return; }
    if (!_orderPrice) { throw new TypeError('Order Price has not been set'); return; }
    if (!_stopLoss) { throw new TypeError('Stoploss has not been set'); return; }

    this._quantity = (p * _accountSize) / (_orderPrice - _stopLoss);
  }

  set riskRewardRatio(value) {
    let {_orderPrice = NaN, _stopLoss = NaN } = this;

    if (!_stopLoss) { throw new TypeError('Stoploss has not been set'); return; }
    if (!_orderPrice) { throw new TypeError('Order Price has not been set'); return; }

    this._target = _orderPrice + Math.abs(_orderPrice - _stopLoss) * value;
  }

  get orderUpdated() { return this._orderUpdated; }
  get orderType() { return this._orderType; }
  get orderPrice() { return this._orderPrice || NaN; }
  get stopLoss() { return this._stopLoss || NaN; }
  get target() { return this._target || NaN; }
  get quantity() { return this._quantity || NaN; }
  get isBuyOrder() { return this._isBuyOrder || false; }
  get isSellOrder() { return this._isSellOrder || false; }
  get accountSize() { return this._accountSize || NaN; }

  get risk() { 
    let { _quantity = NaN, _orderPrice = NaN, _stopLoss = NaN, _accountSize = NaN } = this;   
    
    if (!_accountSize) { throw new TypeError('Account Size has not been set'); return; }
    if (!_stopLoss) { throw new TypeError('Stoploss has not been set'); return; }
    if (!_orderPrice) { throw new TypeError('Order Price has not been set'); return; }
    if (!_quantity) { throw new TypeError('Quantity has not been set'); return; }

    return (_quantity * Math.abs(_orderPrice - _stopLoss)) / _accountSize; 
  }

  get reward() {
    let { _quantity = NaN, _orderPrice = NaN, _target = NaN, _accountSize = NaN } = this;

    if (!_orderPrice) { throw new TypeError('Order Price has not been set'); return; }
    if (!_target) { throw new TypeError('Target has not been set'); return; }
    if (!_accountSize) { throw new TypeError('Account Size has not been set'); return; }
    if (!_quantity) { throw new TypeError('Quantity has not been set'); return; }

    return (_quantity * Math.abs(_target - _orderPrice)) / _accountSize;
  }

  get riskRewardRatio() {
    let { _target = NaN, _orderPrice = NaN, _stopLoss = NaN } = this;   
    
    if (!_orderPrice) { throw new TypeError('Order Price has not been set'); return; }
    if (!_target) { throw new TypeError('Target has not been set'); return; }
    if (!_stopLoss) { throw new TypeError('Stoploss has not been set'); return; }   

    return Math.abs(this._target - this._orderPrice) / Math.abs(this._orderPrice - this._stopLoss);
  }

  
}


class BuyOrder extends Order {
  constructor(...args) {
    super(...args)
    this._isBuyOrder = true;
  }
}

class SellOrder extends Order {
  constructor(...args) {
    super(...args)
    this._isSellOrder = true;
  }
}

module.exports.BuyOrder = BuyOrder;
module.exports.SellOrder = SellOrder;
module.exports.OrderType = OrderType;
