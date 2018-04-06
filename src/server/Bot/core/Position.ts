import { LiveOrder } from 'gdax-trading-toolkit/build/src/lib';
import { Writable } from 'stream';
import { Trader } from 'gdax-trading-toolkit/build/src/core/Trader';
import { PlaceOrderMessage, TradeExecutedMessage, MyOrderPlacedMessage, TradeFinalizedMessage, ErrorMessage, StopActiveMessage } from 'gdax-trading-toolkit/build/src/core';
import { EventEmitter } from 'events';
import { AuthenticatedExchangeAPI, Balances } from 'gdax-trading-toolkit/build/src/exchanges/AuthenticatedExchangeAPI';
import { BigJS, Big } from 'gdax-trading-toolkit/build/src/lib/types';
import { RetryOrderHandler } from './RetryOrderHandler';
import * as _ from 'underscore';
import { Logger } from 'gdax-trading-toolkit/build/src/utils/Logger';
import { CancelPendingEntryError, PlaceOrderFailError } from '../lib/errors';



export enum PositionType {
  Short = 'short',
  Long = 'long',
}

export enum State {
  Pending = 'Pending',
  Active = 'Active',
  Ready = 'Ready',
}; 

export enum PositionEntryEvent {
  Long = 'Position.enter-long',
  Short = 'Position.enter-short'
}

export enum PositionCancelEnterEvent {
  Long = 'Position.cancel-enter-long',
  Short = 'Position.cancel-enter-short'
}

export enum PositionCancelExitEvent {
  Long = 'Position.cancel-exit-long',
  Short = 'Position.cancel-exit-short'
}

export enum PositionExitEvent {
  Long = 'Position.exit-long',
  Short = 'Position.exit-short',
}

/**
 * Configuration options for Position  
 * @param {BigJS} [availFundsPerc = Big(1.0)] Maximum percentage of available balance to use
 * @param {boolean} [waitForFundsToClear = true] Whether to wait for funds to be available after a trade
 * @param {number} [maxRetriesOnOrderFail = 1] Maximum number of times to retry if order placement fails
 * @param {number} [retryLimit = 1] Number of attempts per Interval
 * @param {number} [retryInterval = 350] Length of interval in ms
 */
export interface PositionConfig {
  availFundsPerc?: BigJS // Maximum percentage of available balance to use
  waitForFundsToClear?: boolean; // Whether to wait for funds to be available after a trade
  maxRetriesOnOrderFail?: number; //
  retryLimit?: number;
  retryInterval?: number;
  logger?: Logger;
}

export abstract class Position extends EventEmitter {
  public type: PositionType;
  protected _state: State;
  protected _trader: Trader;
  protected _api: AuthenticatedExchangeAPI;
  protected _entry: LiveOrder | null;
  protected _takeProfit: LiveOrder | null;
  protected _base: string;
  protected _quote: string;
  protected _availFundsPerc: BigJS;
  protected _waitForFunds: boolean;
  protected _maxRetriesOnOrderFail: number; 
  protected _retryLimit: number;
  protected _retryInterval: number;
  protected _logger: Logger;

  constructor(trader: Trader, api: AuthenticatedExchangeAPI, config: PositionConfig = {}) {
    super();
    this._state = State.Ready;
    this._trader = trader;
    this._api = api;
    [this._base, this._quote] = this._trader.productId.split('-');
    this._entry = null;
    this._takeProfit = null;

    this._availFundsPerc = config.availFundsPerc || Big(1.0);
    this._waitForFunds = config.waitForFundsToClear || true;
    this._maxRetriesOnOrderFail = config.maxRetriesOnOrderFail || 1;
    this._retryLimit = config.retryLimit || 1;
    this._retryInterval = config.retryInterval || 350;
    this._logger = config.logger;

    Trader.prototype.on = function(event: string | symbol, listener: (...args: any[]) => void): any {
      this.logger.log('debug', `Trader->${listener.name} registered for .on('${event}')`);
      return EventEmitter.prototype.on.call(this, event, listener);
    }

    Trader.prototype.once = function(event: string | symbol, listener: (...args: any[]) => void): any {
      this.logger.log('debug', `Trader->${listener.name} registered for .once('${event}')`);
      return EventEmitter.prototype.once.call(this, event, listener);
    }

    Trader.prototype.removeListener = function(event: string | symbol, listener: (...args: any[]) => void): any {
      this.logger.log('debug', `Trader->${listener.name} removed for ${event}`);
      return EventEmitter.prototype.removeListener.call(this, event, listener);
    }

    Trader.prototype.removeAllListeners = function(event: string | symbol): any {
      this.logger.log('debug', `Trader->All Listeners removed for ${event}`);
      return EventEmitter.prototype.removeAllListeners.call(this, event);
    }
  }

  protected abstract entryEvent(): PositionEntryEvent;
  protected abstract exitEvent(): PositionExitEvent;
  protected abstract cancelEnterEvent(): PositionCancelEnterEvent;
  protected abstract cancelExitEvent(): PositionCancelExitEvent;


  log(level: string, message: string, meta?: any) {
    if (!this._logger) {
      return;
    }

    this._logger.log(level, message, meta);
  }

  cancelPendingEntry(): Promise<void> {
    
    this.log('debug', 'Cancelling Any Pending Entries');

    if (this._state === State.Ready) {
      return Promise.resolve();
    }

    if (this._state === State.Active) {
      return Promise.reject(new CancelPendingEntryError('Position is currently active'));
    }

    if (this._state === State.Pending) {

      this.log('debug', 'Position is in Pending State');
      // An order has been requested already but exchange hasn't yet responded
      // In this case we will respect the first order
      if (!this._entry) {
        return Promise.reject(new CancelPendingEntryError('Previous order request in flight'));
      }

      this.log('debug', 'Canceling Open Order', this._entry.id);

      return this._trader
        .cancelOrder(this._entry.id)

        .then((id: string) => {
          this._entry = null;
          this._state = State.Ready;
          this._trader.removeAllListeners('Trader.trade-executed');
          this._trader.removeAllListeners('Trader.order-placed');
          this._trader.removeAllListeners('Trader.stop-active');
          this._trader.removeAllListeners('Trader.trade-finalized');
          this.removeAllListeners(this.entryEvent());
          this.emit(this.cancelEnterEvent(), id);
          return;
        })
        
        .catch((err) => {
          throw new CancelPendingEntryError('Unable to cancel pending orders');
        });
    }
  }

  inPosition(): State {
    return this._state;
  }

  enter(order: PlaceOrderMessage): Promise<Position> {
    
    this._state = State.Pending;
    let retryHandler = new RetryOrderHandler({ limit: this._retryLimit, interval: this._retryInterval, logger: this._logger });

    return retryHandler
      .sendOrder(order, this._enter.bind(this), this._maxRetriesOnOrderFail)
      .then((pos: Position) => {
        return pos;
      })
      .catch((err) => {
        this._state = State.Ready;
        throw err;
      });
  }

  exit(order: PlaceOrderMessage): Promise<Position> {

    let retryHandler = new RetryOrderHandler({limit: this._retryLimit, interval: this._retryInterval, logger: this._logger});
    return retryHandler.sendOrder(order, this._exit.bind(this), this._maxRetriesOnOrderFail);

  }

  private _enter(msg: PlaceOrderMessage): Promise<Position> {
    
    // avoid mutating the original order object
    let order = _(msg).clone();

    return this.updateOrder(order).then((order: PlaceOrderMessage) => {

      if (order.orderType === 'limit') {
        this.log('debug', 'Position->Placing Limit Order');
        
        let tradeMsg: TradeExecutedMessage;

        let tradeFinalizedListener = (msg: TradeFinalizedMessage) => {
          this.log('debug', `Position->Trade Finalized Listener Triggered`);


          if (msg.orderId === this._entry.id) {

            this._trader.removeListener('Trader.trade-finalized', tradeFinalizedListener);
            this._trader.removeListener('Trader.trade-executed', tradeExecutedListener);
            this._trader.removeListener('Trader.stop-active', stopActiveListener);
            this._trader.removeListener('Trader.order-placed', orderPlacedListener);

            if (msg.reason === 'canceled') {
              this._state = State.Ready;
              this._entry = null;
              this.log('info', `Position->Limit Order ${msg.orderId} Trade Canceled`);
              this.emit(this.cancelEnterEvent(), msg.orderId);
            } else {
              this._state = State.Active;

              this.log('info', `Position->Limit Order ${msg.orderId} Trade Finalized`);

              if (this._waitForFunds) {
                this.emit(this.entryEvent(), tradeMsg);
              }
            }
          }
        }

        let tradeExecutedListener = (msg: TradeExecutedMessage) => {

          this.log('debug', `Position->Trade Executed Listener Triggered`);

          if (msg.orderId === this._entry.id) {
            this._state = State.Active;

            this._trader.removeListener(
              'Trader.trade-executed',
              tradeExecutedListener
            );

            this.log('info', `Position->Limit Order ${msg.orderId} Trade Executed`);

            if (this._waitForFunds) {
              tradeMsg = msg;
            } else {
              this.emit(this.entryEvent(), msg);
            }
          }
        };

        let orderPlacedListener = (msg: MyOrderPlacedMessage) => {

          this.log('debug', `Position->Order Placed Listener Triggered`);

          if (msg.orderId === this._entry.id) {
            // order is now on the order book, but position is still pending
            this._trader.removeListener(
              'Trader.order-placed',
              orderPlacedListener
            );

            this.log('info', `Position->Limit Order ${msg.orderId} Placed`);
          }
        };

        let stopActiveListener = (msg: StopActiveMessage) => {
          this.log('info', `Position->Stop Limit Order ${msg.orderId} Active`);
          for (let key in msg) {
            this.log('debug', `  ${key}: ${(msg as any)[key]}`);
          }

          this._trader.removeListener(
            'Trader.stop-active',
            stopActiveListener
          );
        };

        // Listen for the stop order to be triggered to place the order on the books
        this._trader.on('Trader.order-placed', orderPlacedListener);
        this._trader.on('Trader.trade-executed', tradeExecutedListener);
        this._trader.on('Trader.trade-finalized', tradeFinalizedListener);

        if (order.extra && order.extra.stop) {
          this._trader.on('Trader.stop-active', stopActiveListener);
        }
        
        return this._trader.placeOrder(order).then((order: LiveOrder) => {

          if (order === null) {
            this._trader.removeListener('Trader.order-placed', orderPlacedListener);
            this._trader.removeListener('Trader.stop-active', stopActiveListener);
            this._trader.removeListener('Trader.trade-executed', tradeExecutedListener);
            this._trader.removeListener('Trader.trade-finalized', tradeFinalizedListener);
            throw new PlaceOrderFailError('Placing Order failed');
          }

          this._entry = order;

          this.log('debug', 'Position->Exchanged Responded to Order Request');
          for (let key in order) {
            this.log('debug', `  ${key}: ${(order as any)[key]}`);
          }

          return this;
        })
        .catch((err) => {
          this._trader.removeListener('Trader.order-placed', orderPlacedListener);
          this._trader.removeListener('Trader.stop-active', stopActiveListener);
          this._trader.removeListener('Trader.trade-executed', tradeExecutedListener);
          this._trader.removeListener('Trader.trade-finalized', tradeFinalizedListener);
          throw err;
        });

      } else {
        this.log('debug', 'Position->Placing Market Order');

        let tradeMsg: TradeExecutedMessage;

        let tradeFinalizedListener = (msg: TradeFinalizedMessage) => {
          this.log('debug', `Position->Trade Finalized Listener Triggered`);


          if (msg.orderId === this._entry.id) {

            this._trader.removeListener('Trader.trade-finalized', tradeFinalizedListener);
            this._trader.removeListener('Trader.trade-executed', tradeExecutedListener);
            this._trader.removeListener('Trader.stop-active', stopActiveListener);

            if (msg.reason === 'canceled') {
              this._state = State.Ready;
              this._entry = null;
              this.log('info', `Position->Limit Order ${msg.orderId} Trade Canceled`);
              this.emit(this.cancelEnterEvent(), msg.orderId);
            } else {
              this._state = State.Active;

              this.log('info', `Position->Market Order ${msg.orderId} Trade Finalized`);

              if (this._waitForFunds) {
                this.emit(this.entryEvent(), tradeMsg);
              }
            }
          }
        }

        let tradeExecutedListener = (msg: TradeExecutedMessage) => {
          this.log('debug', `Position->Trade Executed Listener Triggered`);

          if (msg.orderId === this._entry.id) {
            this._state = State.Active;

            this._trader.removeListener(
              'Trader.trade-executed',
              tradeExecutedListener
            );

            this.log('info', `Position->Market Order ${msg.orderId} Trade Executed`);

            if (this._waitForFunds) {
              tradeMsg = msg;
            } else {
              this.emit(this.entryEvent(), msg);
            }
          }
        };

        let stopActiveListener = (msg: StopActiveMessage) => {
          this.log('info', `Position->Stop Market Order ${msg.orderId} Active`);
          for (let key in msg) {
            this.log('debug', `  ${key}: ${(msg as any)[key]}`);
          }

          this._trader.removeListener(
            'Trader.stop-active',
            stopActiveListener
          );
        };

        this._trader.on('Trader.trade-executed', tradeExecutedListener);
        this._trader.on('Trader.trade-finalized', tradeFinalizedListener);

        if (order.extra && order.extra.stop) {
          this._trader.on('Trader.stop-active', stopActiveListener);
        }

        return this._trader.placeOrder(order).then((order: LiveOrder) => {


          if (order === null) {
            this._trader.removeListener('Trader.trade-executed', tradeExecutedListener);
            this._trader.removeListener('Trader.trade-finalized', tradeFinalizedListener);
            this._trader.removeListener('Trader.stop-active', stopActiveListener);
            throw new PlaceOrderFailError('Placing Order failed');
          }

          this._entry = order;
        
          this.log('debug', 'Position->Exchanged Responded to Order Request');
          for (let key in order) {
            this.log('debug', `  ${key}: ${(order as any)[key]}`);
          }

          return this;
        })
        .catch((err) => {
          this._trader.removeListener('Trader.stop-active', stopActiveListener);
          this._trader.removeListener('Trader.trade-executed', tradeExecutedListener);
          this._trader.removeListener('Trader.trade-finalized', tradeFinalizedListener);
          throw err;
        });
      }
    });
  }
  on(event: string | symbol, listener: (...args: any[]) => void): this {
    this.log('debug', `Position->${listener.name} registered for .on('${event}')`);
    return EventEmitter.prototype.on.call(this, event, listener);
  }

  once(event: string | symbol, listener: (...args: any[]) => void): this {
    this.log('debug', `Position->${listener.name} registered for .once('${event}')`);
    return EventEmitter.prototype.once.call(this, event, listener);
  }

  removeListener(event: string | symbol, listener: (...args: any[]) => void): this {
    this.log('debug', `Position->${listener.name} removed for ${event}`);
    return EventEmitter.prototype.removeListener.call(this, event, listener);
  }

  removeAllListeners(event: string | symbol): this {
    this.log('debug', `Position->All Listeners removed for ${event}`);
    return EventEmitter.prototype.removeAllListeners.call(this, event);
  }

  private _exit(msg: PlaceOrderMessage): Promise<Position> {
    
    // avoid mutating the original order object
    let order = _(msg).clone();

    return this
      .updateOrder(order)
      .then((order: PlaceOrderMessage) => {

        if (order.orderType === 'limit') {
          this.log('debug', 'Position->Placing Exit Limit Order');

          let tradeMsg: TradeExecutedMessage;

          let tradeFinalizedListener = (msg: TradeFinalizedMessage) => {
            this.log('debug', `Position->Trade Finalized Listener Triggered`);

            if (msg.orderId === this._takeProfit.id) {

              this._trader.removeListener('Trader.trade-finalized', tradeFinalizedListener);
              this._trader.removeListener('Trader.trade-executed', tradeExecutedListener);
              this._trader.removeListener('Trader.stop-active', stopActiveListener);
              this._trader.removeListener('Trader.order-placed', orderPlacedListener);

              if (msg.reason === 'canceled') {
                this._takeProfit = null;
                this.log('info', `Position->Limit Order ${msg.orderId} Trade Canceled`);
                this.emit(this.cancelExitEvent(), msg.orderId);
              } else {                
                this.log('info', `Position->Limit Order ${msg.orderId} Trade Finalized`);

                if (this._waitForFunds) {
                  this.emit(this.exitEvent(), tradeMsg);
                }

                this._state = State.Ready;
              }
            }
          };

          let tradeExecutedListener = (msg: TradeExecutedMessage) => {
            this.log('debug', `Position->Trade Executed Listener Triggered`);

            if (msg.orderId === this._takeProfit.id) {

              this._trader.removeListener(
                'Trader.trade-executed',
                tradeExecutedListener
              );

              this.log('info', `Position->Limit Order ${msg.orderId} Trade Executed`);

              if (this._waitForFunds) {
                tradeMsg = msg;
              } else {
                this.emit(this.exitEvent(), msg);
              }
            }
          };

          let orderPlacedListener = (msg: MyOrderPlacedMessage) => {
            this.log('debug', `Position->Order Placed Listener Triggered`);
            
            if (msg.orderId === this._takeProfit.id) {
              // order is now on the order book, but position is still pending
              this._trader.removeListener(
                'Trader.order-placed',
                orderPlacedListener
              );

              this.log('info', `Position->Limit Order ${msg.orderId} Placed`);
            }
          };

          let stopActiveListener = (msg: StopActiveMessage) => {

            this.log('info', `Position->Stop Limit Order ${msg.orderId} Active`);
            for (let key in msg) {
              this.log('debug', `  ${key}: ${(msg as any)[key]}`);
            }

            this._trader.removeListener(
              'Trader.stop-active',
              stopActiveListener
            );
          };

          // Listen for the stop order to be triggered to place the order on the books
          // Listen for the stop order to be triggered to place the order on the books
          this._trader.on('Trader.order-placed', orderPlacedListener);
          this._trader.on('Trader.trade-executed', tradeExecutedListener);
          this._trader.on('Trader.trade-finalized', tradeFinalizedListener);

          if (order.extra && order.extra.stop) {
            this._trader.on('Trader.stop-active', stopActiveListener);
          }

          return this._trader
            .placeOrder(order)
            .then((order: LiveOrder) => {
              if (order === null) {
                this._trader.removeListener('Trader.trade-executed', tradeExecutedListener);
                this._trader.removeListener('Trader.order-placed', orderPlacedListener);
                this._trader.removeListener('Trader.trade-finalized', tradeFinalizedListener);
                this._trader.removeListener('Trader.stop-active', stopActiveListener);
                throw new PlaceOrderFailError('Placing Order failed');
              }
              
              this._takeProfit = order;

              this.log('debug', 'Position->Exchanged Responded to Order Request');
              for (let key in order) {
                this.log('debug', `  ${key}: ${(order as any)[key]}`);
              }
              
              return this;
            })
            .catch((err) => {
              this._trader.removeListener('Trader.order-placed', orderPlacedListener);
              this._trader.removeListener('Trader.stop-active', stopActiveListener);
              this._trader.removeListener('Trader.trade-executed', tradeExecutedListener);
              this._trader.removeListener('Trader.trade-finalized', tradeFinalizedListener);
              throw err;
            });

        } else {

          this.log('debug', 'Position->Placing Exit Market Order');

          let tradeMsg: TradeExecutedMessage;

          let tradeFinalizedListener = (msg: TradeFinalizedMessage) => {
            this.log('debug', `Position->Trade Finalized Listener Triggered`);

            if (msg.orderId === this._takeProfit.id) {

              this._trader.removeListener('Trader.trade-finalized',tradeFinalizedListener);
              this._trader.removeListener('Trader.trade-executed', tradeExecutedListener);
              this._trader.removeListener('Trader.stop-active', stopActiveListener);

              if (msg.reason === 'canceled') {
                this._state = State.Ready;
                this._entry = null;
                this.log('info', `Position->Limit Order ${msg.orderId} Trade Canceled`);
                this.emit(this.cancelExitEvent(), msg.orderId);
              } else {
              
                this.log('info', `Position->Market Order ${msg.orderId} Trade Finalized`);

                if (this._waitForFunds) {
                  this.emit(this.exitEvent(), tradeMsg);
                }

                this._state = State.Ready;
              }
            }
          };

          let tradeExecutedListener = (msg: TradeExecutedMessage) => {
            this.log('debug', `Position->Trade Executed Listener Triggered`);

            if (msg.orderId === this._takeProfit.id) {

              this._trader.removeListener(
                'Trader.trade-executed',
                tradeExecutedListener
              );

              this.log('info', `Position->Market Order ${msg.orderId} Trade Executed`);

              if (this._waitForFunds) {
                tradeMsg = msg;
              } else {
                this.emit(this.exitEvent(), msg);
              }
            }
          };

          let stopActiveListener = (msg: StopActiveMessage) => {
            this.log('info', `Position->Stop Market Order ${msg.orderId} Active`);
            for (let key in msg) {
              this.log('debug', `  ${key}: ${(msg as any)[key]}`);
            }

            this._trader.removeListener(
              'Trader.stop-active',
              stopActiveListener
            );
          };

          this._trader.on('Trader.trade-executed', tradeExecutedListener);
          this._trader.on('Trader.trade-finalized', tradeFinalizedListener);

          if (order.extra && order.extra.stop) {
            this._trader.on('Trader.stop-active', stopActiveListener);
          }

          return this._trader
            .placeOrder(order)
            .then((order: LiveOrder) => {

              if (order === null) {
                this._trader.removeListener('Trader.trade-executed', tradeExecutedListener);
                this._trader.removeListener('Trader.trade-finalized', tradeFinalizedListener);
                this._trader.removeListener('Trader.stop-active', stopActiveListener);
                throw new PlaceOrderFailError('Placing Order failed');
              }

              this._takeProfit = order;

              this.log('debug', 'Position->Exchanged Responded to Order Request');
              for (let key in order) {
                this.log('debug', `${key}: ${(order as any)[key]}`);
              }

              return this;
            })
            .catch((err) => {
              this._trader.removeListener('Trader.stop-active', stopActiveListener);
              this._trader.removeListener('Trader.trade-executed', tradeExecutedListener);
              this._trader.removeListener('Trader.trade-finalized', tradeFinalizedListener);
              throw err;
            });
        }
      });
  }

  getAvailableFunds(currency: string): Promise<BigJS> {
    return this._api.loadBalances().then((balances: Balances) => {
      // get avilable balance
      let profileId: string = Object.keys(balances)[0];
      let avail: BigJS = balances[profileId][currency].available;
      this.log('debug', `Available Funds: ${avail.toFixed(8)} ${currency}`);

      return avail;
    });
  }

  updateOrder(order: PlaceOrderMessage): Promise<PlaceOrderMessage> {
    return new Promise(resolve => {
      if (!order.size && !order.funds) {
        let currency = order.side === 'buy' ? this._quote : this._base;

        this.log('debug', 'No size or funds, getting available funds');
        this.getAvailableFunds(currency).then((balance: BigJS) => {
          // if (order.side === 'buy' && order.extra && order.extra.stop) {
            balance = balance.mul(this._availFundsPerc);
          // }

          if (order.side === 'buy' && order.orderType === 'limit') {
            order.size = balance.dividedBy(order.price).toFixed(8);
          } else if (order.side === 'buy' && order.orderType === 'market') {
            order.funds = balance.toFixed(2);
          } else {
            order.size = balance.toFixed(8);
          }
          resolve(order);
        });
      } else {
        resolve(order);
      }
    });
  }
}

export class LongPosition extends Position {

  public type = PositionType.Long;

  constructor(trader: Trader, api:AuthenticatedExchangeAPI, config?: PositionConfig) {
    super(trader, api, config);
  }

  protected entryEvent(): PositionEntryEvent {
    return PositionEntryEvent.Long;
  }

  protected cancelEnterEvent(): PositionCancelEnterEvent {
    return PositionCancelEnterEvent.Long;
  }

  protected exitEvent(): PositionExitEvent {
    return PositionExitEvent.Long;
  }

  protected cancelExitEvent(): PositionCancelExitEvent {
    return PositionCancelExitEvent.Long;
  }

}

export class ShortPosition extends Position {
  
  public type = PositionType.Short;

  constructor(trader: Trader, api:AuthenticatedExchangeAPI, config?: PositionConfig) {
    super(trader, api, config);
  }

  protected entryEvent(): PositionEntryEvent {
    return PositionEntryEvent.Short;
  }

  protected cancelEnterEvent(): PositionCancelEnterEvent {
    return PositionCancelEnterEvent.Short;
  }

  protected exitEvent(): PositionExitEvent {
    return PositionExitEvent.Short;
  }

  protected cancelExitEvent(): PositionCancelExitEvent {
    return PositionCancelExitEvent.Short;
  }
  
}