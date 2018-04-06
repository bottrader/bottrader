import { expect } from 'chai';
import { LongPosition, State, ShortPosition } from '../../src/server/Bot/core/Position';
import { Trader, PlaceOrderMessage, MyOrderPlacedMessage, TradeExecutedMessage, StopActiveMessage, TradeFinalizedMessage } from 'gdax-trading-toolkit/build/src/core';
import { GDAXExchangeAPI } from 'gdax-trading-toolkit/build/src/exchanges';
import { Logger } from 'gdax-trading-toolkit/build/src/utils/Logger';
import { NullLogger } from 'gdax-trading-toolkit/build/src/utils';
import { LiveOrder } from 'gdax-trading-toolkit/build/src/lib';
import { Big } from 'gdax-trading-toolkit/build/src/lib/types';
import { PlaceOrderFailError } from '../../src/server/Bot/lib/errors';
import { AssertionError } from 'assert';
import * as assert from 'assert';


let config = {
  logger: NullLogger,
  exchangeAPI: new GDAXExchangeAPI({
    logger: NullLogger, 
    apiUrl: 'https://api-public.sandbox.gdax.com',
    auth: { 
      key: 'ed7445c6d590daaca5d20786334ef912', 
      secret: '+Bb0Xs1njZiFf6pPT8pjIMndrJrOMfRY8jUQDJMsdgpyTr0Dm3PvgiPdgQONeY74nA4RkcHU+83tNYwfKbMZtA==', 
      passphrase: '3qsjy2ddvbx'
    }
  }),
  productId: 'BTC-USD',
  fitOrders: true
}

let productId = 'BTC-USD';

let trader: Trader;
let count = 0;
let reqOrder: PlaceOrderMessage;

let placeOrderReject = function(error: Error): (req: PlaceOrderMessage) => Promise<LiveOrder> {
  
  return function(req: PlaceOrderMessage): Promise<LiveOrder> {
    count++;
    reqOrder = req;
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(error);
      }, 5);
    })
  };
};

let placeOrderResolve = function(order: LiveOrder): (req: PlaceOrderMessage) => Promise<LiveOrder> {

  return function (req: PlaceOrderMessage): Promise<LiveOrder> {
    count++;
    reqOrder = req;
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(order);
      }, 5);
    });
  };
};

let cancelOrderResolve = function(): (id: string) => Promise<string> {

  return function (id: string): Promise<string> {

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(id);
      }, 5);
    });
  }
}

let cancelOrderReject = function (error: Error): (id: string) => Promise<string> {

  return function (id: string): Promise<string> {

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(error);
      }, 5);
    });
  }
}

let emitMessage = function(event: string, msg: any) {
  this.emit(event, msg);
}


describe('Position Tests', () => {

  describe('Long Positions', () => {

    describe('CancelPendingEntries()', () => {

      beforeEach(() => {
        trader = new Trader(config);
      });

      it('should throw an error if there is an active position', (done) => {
        trader.placeOrder = placeOrderResolve({
          price: Big(1000),
          size: Big(1.0),
          side: 'buy',
          id: '1234',
          time: new Date(),
          productId: productId,
          status: 'pending',
          extra: 'none'
        });

        trader.cancelOrder = cancelOrderReject(new Error('failed'));

        let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
        pos.enter({
          time: new Date(),
          type: 'placeOrder',
          productId: productId,
          orderType: 'market',
          size: '1.0',
          side: 'buy',
        })
          .then((p: LongPosition) => {
            expect(p.inPosition()).to.equal(State.Pending);
            expect(p).to.deep.equal(pos);
            emitMessage.call(trader, 'Trader.trade-executed', {
              type: 'tradeExecuted',
              time: new Date(),
              productId: productId,
              orderId: '1234',
              side: 'buy',
              price: '1001',
              orderType: 'market',
              tradeSize: '1.0',
              remainingSize: '0.0'
            } as TradeExecutedMessage)
            expect(p.inPosition()).to.equal(State.Active);

            p.cancelPendingEntry()
              .then(() => {
                done(new Error('failed'));
              })
              .catch((err) => {
                expect(err).to.be.an('error');
                expect(err.name).to.equal('CancelPendingEntryError');
                done();
              });
          })
          .catch((err) => {
            done(err);
          })
      });
      it('should succeed if the position is in ready state', (done) => {
        trader.placeOrder = placeOrderResolve({
          price: Big(1000),
          size: Big(1.0),
          side: 'buy',
          id: '1234',
          time: new Date(),
          productId: productId,
          status: 'pending',
          extra: 'none'
        });

        trader.cancelOrder = cancelOrderReject(new Error('failed'));

        let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
        expect(pos.inPosition()).to.equal(State.Ready);
        pos.cancelPendingEntry()
          .then(() => {
            expect(pos.inPosition()).to.equal(State.Ready);
            done();
            
          })
          .catch((err) => {
            done(err);
          });
      });
      it('should handle successive calls', (done) => {
        trader.placeOrder = placeOrderResolve({
          price: Big(1000),
          size: Big(1.0),
          side: 'buy',
          id: '1234',
          time: new Date(),
          productId: productId,
          status: 'pending',
          extra: 'none'
        });

        trader.cancelOrder = cancelOrderReject(new Error('failed'));

        let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
        expect(pos.inPosition()).to.equal(State.Ready);
        pos.cancelPendingEntry()
          .then(() => {
            expect(pos.inPosition()).to.equal(State.Ready);
            pos.cancelPendingEntry()
              .then(() => {
                expect(pos.inPosition()).to.equal(State.Ready);
                done();
              })
              .catch((err) => {
                done(err);
              });
          })
          .catch((err) => {
            done(err);
          });
      });
      it('should handle parallel calls', (done) => {
        trader.placeOrder = placeOrderResolve({
          price: Big(1000),
          size: Big(1.0),
          side: 'buy',
          id: '1234',
          time: new Date(),
          productId: productId,
          status: 'pending',
          extra: 'none'
        });

        trader.cancelOrder = cancelOrderReject(new Error('failed'));

        let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
        expect(pos.inPosition()).to.equal(State.Ready);
        let first = false;
        let second = false;
        pos.cancelPendingEntry()
          .then(() => {
            expect(pos.inPosition()).to.equal(State.Ready);
            if (second) {
              done();
            } else {
              first = true;
            }
          })
          .catch((err) => {
            done(err);
          });
        pos.cancelPendingEntry()
          .then(() => {
            expect(pos.inPosition()).to.equal(State.Ready);
            if (first) {
              done();
            } else {
              second = true;
            }
          })
          .catch((err) => {
            done(err);
          });
      });
      it('should cancel any pending orders', (done) => {
        trader.placeOrder = placeOrderResolve({
          price: Big(1000),
          size: Big(1.0),
          side: 'buy',
          id: '1234',
          time: new Date(),
          productId: productId,
          status: 'pending',
          extra: 'none'
        });

        trader.cancelOrder = cancelOrderResolve();

        let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
        pos.enter({
          time: new Date(),
          type: 'placeOrder',
          productId: productId,
          orderType: 'limit',
          funds: '100',
          side: 'buy',
          price: '1000'
        })
          .then((p: LongPosition) => {
            expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
            expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
            expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
            expect(trader.listenerCount('Trader.order-placed')).to.equal(1);
            expect(p.inPosition()).to.equal(State.Pending);
            expect(p).to.deep.equal(pos);
            emitMessage.call(trader, 'Trader.order-placed', {
              type: 'myOrderPlaced',
              time: new Date(),
              productId: productId,
              orderId: '1234',
              side: 'buy',
              size: '1.0',
              price: '1001',
              orderType: 'market',
              tradeSize: '1.0',
              remainingSize: '0.0',
              sequence: 1
            } as MyOrderPlacedMessage)
            expect(p.inPosition()).to.equal(State.Pending);
            expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
            expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
            expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
            expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
            p.cancelPendingEntry()
              .then(() => {
                expect(p.inPosition()).to.equal(State.Ready);
                expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
                expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
                expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
                done();
              })
              .catch((err) => {
                done(err);
              });
          })
          .catch((err) => {
            done(err);
          })
      });
      it('should wait for the cancel orders to be canceled', (done) => {
        trader.placeOrder = placeOrderResolve({
          price: Big(1000),
          size: Big(1.0),
          side: 'buy',
          id: '1234',
          time: new Date(),
          productId: productId,
          status: 'pending',
          extra: 'none'
        });

        trader.cancelOrder = cancelOrderResolve();

        let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
        pos.enter({
          time: new Date(),
          type: 'placeOrder',
          productId: productId,
          orderType: 'limit',
          funds: '100',
          side: 'buy',
          price: '1000'
        })
          .then((p: LongPosition) => {
            expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
            expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
            expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
            expect(trader.listenerCount('Trader.order-placed')).to.equal(1);
            expect(p.inPosition()).to.equal(State.Pending);
            expect(p).to.deep.equal(pos);
            emitMessage.call(trader, 'Trader.order-placed', {
              type: 'myOrderPlaced',
              time: new Date(),
              productId: productId,
              orderId: '1234',
              side: 'buy',
              size: '1.0',
              price: '1001',
              orderType: 'market',
              tradeSize: '1.0',
              remainingSize: '0.0',
              sequence: 1
            } as MyOrderPlacedMessage)
            expect(p.inPosition()).to.equal(State.Pending);
            expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
            expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
            expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
            expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
            p.cancelPendingEntry()
              .then(() => {
                expect(p.inPosition()).to.equal(State.Ready);
                expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
                expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
                expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
                done();
              })
              .catch((err) => {
                done(err);
              });
            expect(p.inPosition()).to.equal(State.Pending);
          })
          .catch((err) => {
            done(err);
          })
      });
      it('should throw an error if the order cannot be canceled', (done) => {
        trader.placeOrder = placeOrderResolve({
          price: Big(1000),
          size: Big(1.0),
          side: 'buy',
          id: '1234',
          time: new Date(),
          productId: productId,
          status: 'pending',
          extra: 'none'
        });

        trader.cancelOrder = cancelOrderReject(new Error('failed'));

        let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
        pos.enter({
          time: new Date(),
          type: 'placeOrder',
          productId: productId,
          orderType: 'limit',
          funds: '100',
          side: 'buy',
          price: '1000'
        })
          .then((p: LongPosition) => {
            expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
            expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
            expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
            expect(trader.listenerCount('Trader.order-placed')).to.equal(1);
            expect(p.inPosition()).to.equal(State.Pending);
            expect(p).to.deep.equal(pos);
            emitMessage.call(trader, 'Trader.order-placed', {
              type: 'myOrderPlaced',
              time: new Date(),
              productId: productId,
              orderId: '1234',
              side: 'buy',
              size: '1.0',
              price: '1001',
              orderType: 'market',
              tradeSize: '1.0',
              remainingSize: '0.0',
              sequence: 1
            } as MyOrderPlacedMessage)
            expect(p.inPosition()).to.equal(State.Pending);
            expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
            expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
            expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
            expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
            p.cancelPendingEntry()
              .then(() => {
                done(assert(false));
              })
              .catch((err) => {
                expect(err).to.be.an('error');
                expect(err.name).to.equal('CancelPendingEntryError');
                expect(p.inPosition()).to.equal(State.Pending);
                expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
                expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
                expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
                done();
              });
            expect(p.inPosition()).to.equal(State.Pending);
          })
          .catch((err) => {
            done(err);
          })
      });
      it('should wait for the request to complete if the state is pending but dont have an order id');
    });

    describe('InPosition()', () => {

      beforeEach(() => {
        trader = new Trader(config);
      });

      describe('Entry Market Orders', () => {
        it('should return Ready if there is no active position', () => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: 'id',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { 
            maxRetriesOnOrderFail: 3,
            waitForFundsToClear: false,
            retryLimit: 10,
            retryInterval: 100
          });

          expect(pos.inPosition()).to.equal(State.Ready);

        });
        it('should return Pending if there is a pending entry market order request to the Exchange', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: 'id',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, {
            maxRetriesOnOrderFail: 3,
            waitForFundsToClear: false,
            retryLimit: 10,
            retryInterval: 100
          });
          count = 0;
          expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
          expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
          expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
          expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            funds: '100',
            side: 'buy',
          })
            .then((p: LongPosition) => {
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              expect(count).to.equal(1);
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
          expect(pos.inPosition()).to.equal(State.Pending);
        });

        it('should return Active if the entry market order trade has executed', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            funds: '100',
            side: 'buy',
          })
            .then((p: LongPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
        });
      });
      describe('Entry limit orders', () => {
        it('should return Pending if there is a pending entry limit order request to the Exchange', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, {
            maxRetriesOnOrderFail: 3,
            waitForFundsToClear: false,
            retryLimit: 10,
            retryInterval: 100
          });
          count = 0;
          expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
          expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
          expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
          expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'limit',
            price: '1000',
            size: '1.0',
            side: 'buy',
          })
            .then((p: LongPosition) => {
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(1);
              expect(count).to.equal(1);
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
          expect(pos.inPosition()).to.equal(State.Pending);
        });
        it('should return Pending if the limit order has been placed on the order book', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'received',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'limit',
            price: '1000',
            size: '1.0',
            side: 'buy',
          })
            .then((p: LongPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.order-placed', {
                type: 'myOrderPlaced',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                size: '1.0',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0',
                sequence: 1
              } as MyOrderPlacedMessage)
              expect(p.inPosition()).to.equal(State.Pending);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
        });
        it('should return Active if the entry limit order trade has executed', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'received',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'limit',
            price: '1000',
            size: '1.0',
            side: 'buy',
          })
            .then((p: LongPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.order-placed', {
                type: 'myOrderPlaced',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                size: '1.0',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0',
                sequence: 1
              } as MyOrderPlacedMessage)
              expect(p.inPosition()).to.equal(State.Pending);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                orderType: 'limit',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage);
              expect(p.inPosition()).to.equal(State.Active);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
        });
        it('should return Active if the entry limit order trade has finalized', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'received',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'limit',
            price: '1000',
            size: '1.0',
            side: 'buy',
          })
            .then((p: LongPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.order-placed', {
                type: 'myOrderPlaced',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                size: '1.0',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0',
                sequence: 1
              } as MyOrderPlacedMessage)
              expect(p.inPosition()).to.equal(State.Pending);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                orderType: 'limit',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage);
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
        });
      });
      describe('Entry stop market orders', () => {
        it('should return Pending if there is a pending entry market stop order request to the Exchange', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'received',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
          expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
          expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
          expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            size: '1.0',
            side: 'buy',
            extra: {
              stop: 'entry',
              stopPrice: '1001'
            }
          })
            .then((p: LongPosition) => {
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(1);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
            expect(pos.inPosition()).to.equal(State.Pending);
        });
        it('should return Pending if there is an active stop order', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'received',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            size: '1.0',
            side: 'buy',
            extra: {
              stop: 'entry',
              stopPrice: '1001'
            }
          })
            .then((p: LongPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.stop-active', {
                type: 'stopActive',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                funds: '1.0',
                side: 'buy',
                size: '1.0',
                price: '1002',
                orderType: 'market',
                stopType: 'entry',
                private: true,
                stopPrice: '1001',
                takerFeeRate: '0.25',
                sequence: 1
              } as StopActiveMessage)
              expect(p.inPosition()).to.equal(State.Pending);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
          expect(pos.inPosition()).to.equal(State.Pending);
        });
        it('should return Active if the entry stop market order has been triggered and the trade has executed', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'received',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            size: '1.0',
            side: 'buy',
            extra: {
              stop: 'entry',
              stopPrice: '1001'
            }
          })
            .then((p: LongPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.stop-active', {
                type: 'stopActive',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                funds: '1.0',
                side: 'buy',
                size: '1.0',
                price: '1001',
                orderType: 'market',
                stopType: 'entry',
                private: true,
                stopPrice: '1001',
                takerFeeRate: '0.25',
                sequence: 1
              } as StopActiveMessage)
              expect(p.inPosition()).to.equal(State.Pending);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1002',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage);
              expect(p.inPosition()).to.equal(State.Active);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
          expect(pos.inPosition()).to.equal(State.Pending); 
        });
        it('should return Active if the entry stop market order has been triggered and the trade has finalized', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'received',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            size: '1.0',
            side: 'buy',
            extra: {
              stop: 'entry',
              stopPrice: '1001'
            }
          })
            .then((p: LongPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.stop-active', {
                type: 'stopActive',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                funds: '1.0',
                side: 'buy',
                size: '1.0',
                price: '1001',
                orderType: 'market',
                stopType: 'entry',
                private: true,
                stopPrice: '1001',
                takerFeeRate: '0.25',
                sequence: 1
              } as StopActiveMessage)
              expect(p.inPosition()).to.equal(State.Pending);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1002',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage);
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1002',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
          expect(pos.inPosition()).to.equal(State.Pending);
        });
      });
      describe('Entry stop limit orders', () => {
        it('should return Pending if there is a pending entry limit stop order request to the Exchange', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, {
            maxRetriesOnOrderFail: 3,
            waitForFundsToClear: false,
            retryLimit: 10,
            retryInterval: 100
          });
          count = 0;
          expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
          expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
          expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
          expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'limit',
            price: '1000',
            size: '1.0',
            side: 'buy',
            extra: {
              stop: 'entry',
              stopPrice: '1001'
            } 
          })
            .then((p: LongPosition) => {
              expect(count).to.equal(1);
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(1);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(1);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
          expect(pos.inPosition()).to.equal(State.Pending);
        });
        it('should return Pending if there is an active stop limit order', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'received',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'limit',
            price: '1000',
            size: '1.0',
            side: 'buy',
            extra: {
              stop: 'entry',
              stopPrice: '1001'
            }
          })
            .then((p: LongPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.stop-active', {
                type: 'stopActive',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                funds: '1.0',
                side: 'buy',
                size: '1.0',
                price: '1002',
                orderType: 'limit',
                stopType: 'entry',
                private: true,
                stopPrice: '1001',
                takerFeeRate: '0.25',
                sequence: 1
              } as StopActiveMessage)
              expect(p.inPosition()).to.equal(State.Pending);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(1);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
          expect(pos.inPosition()).to.equal(State.Pending);
        });
        it('should return Pending if the entry stop limit order has been triggered and is now on the order book', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'received',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'limit',
            price: '1000',
            size: '1.0',
            side: 'buy',
            extra: {
              stop: 'entry',
              stopPrice: '1001'
            }
          })
            .then((p: LongPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.stop-active', {
                type: 'stopActive',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                funds: '1.0',
                side: 'buy',
                size: '1.0',
                price: '1002',
                orderType: 'limit',
                stopType: 'entry',
                private: true,
                stopPrice: '1001',
                takerFeeRate: '0.25',
                sequence: 1
              } as StopActiveMessage)
              expect(p.inPosition()).to.equal(State.Pending);
              emitMessage.call(trader, 'Trader.order-placed', {
                type: 'myOrderPlaced',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                size: '1.0',
                price: '1000',
                orderType: 'limit',
                tradeSize: '1.0',
                remainingSize: '0.0',
                sequence: 1
              } as MyOrderPlacedMessage)
              expect(p.inPosition()).to.equal(State.Pending);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
          expect(pos.inPosition()).to.equal(State.Pending);
        });
        it('should return Active if the entry stop limit order trade has executed', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'received',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'limit',
            price: '1000',
            size: '1.0',
            side: 'buy',
            extra: {
              stop: 'entry',
              stopPrice: '1001'
            }
          })
            .then((p: LongPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.stop-active', {
                type: 'stopActive',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                funds: '1.0',
                side: 'buy',
                size: '1.0',
                price: '1002',
                orderType: 'limit',
                stopType: 'entry',
                private: true,
                stopPrice: '1001',
                takerFeeRate: '0.25',
                sequence: 1
              } as StopActiveMessage)
              expect(p.inPosition()).to.equal(State.Pending);
              emitMessage.call(trader, 'Trader.order-placed', {
                type: 'myOrderPlaced',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                size: '1.0',
                price: '1000',
                orderType: 'limit',
                tradeSize: '1.0',
                remainingSize: '0.0',
                sequence: 1
              } as MyOrderPlacedMessage)
              expect(p.inPosition()).to.equal(State.Pending);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1000',
                orderType: 'limit',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage);
              expect(p.inPosition()).to.equal(State.Active);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
          expect(pos.inPosition()).to.equal(State.Pending);
        });
        it('should return Active if the entry stop limit order trade has finalized', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'received',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'limit',
            price: '1000',
            size: '1.0',
            side: 'buy',
            extra: {
              stop: 'entry',
              stopPrice: '1001'
            }
          })
            .then((p: LongPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.stop-active', {
                type: 'stopActive',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                funds: '1.0',
                side: 'buy',
                size: '1.0',
                price: '1002',
                orderType: 'limit',
                stopType: 'entry',
                private: true,
                stopPrice: '1001',
                takerFeeRate: '0.25',
                sequence: 1
              } as StopActiveMessage)
              expect(p.inPosition()).to.equal(State.Pending);
              emitMessage.call(trader, 'Trader.order-placed', {
                type: 'myOrderPlaced',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                size: '1.0',
                price: '1000',
                orderType: 'limit',
                tradeSize: '1.0',
                remainingSize: '0.0',
                sequence: 1
              } as MyOrderPlacedMessage)
              expect(p.inPosition()).to.equal(State.Pending);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1000',
                orderType: 'limit',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage);
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1000',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
          expect(pos.inPosition()).to.equal(State.Pending);
        });
      });
      describe('Exit Market Orders', () => {
        it('should return Active if there is a pending exit market order request to the Exchange', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            funds: '100',
            side: 'buy',
          })
            .then((p: LongPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);

              trader.placeOrder = placeOrderResolve({
                price: Big(1030),
                size: Big(1.0),
                side: 'sell',
                id: '1235',
                time: new Date(),
                productId: productId,
                status: 'pending',
                extra: 'none'
              });
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              pos.exit({
                time: new Date(),
                type: 'placeOrder',
                productId: productId,
                orderType: 'market',
                funds: '100',
                side: 'sell',
              })
                .then((p: LongPosition) => {
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(p).to.deep.equal(pos);
                  expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
                  expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
                  expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                  expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
                  done();
                })
                .catch((err: Error) => {
                  done(err);
                });
              expect(pos.inPosition()).to.equal(State.Active);
            })
            .catch((err: Error) => {
              done(err);
            });
        });
        it('should return Active if the exit market order trade has executed but not finalized', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            funds: '100',
            side: 'buy',
          })
            .then((p: LongPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);

              trader.placeOrder = placeOrderResolve({
                price: Big(1030),
                size: Big(1.0),
                side: 'sell',
                id: '1235',
                time: new Date(),
                productId: productId,
                status: 'pending',
                extra: 'none'
              });
              pos.exit({
                time: new Date(),
                type: 'placeOrder',
                productId: productId,
                orderType: 'market',
                funds: '100',
                side: 'sell',
              })
                .then((p: LongPosition) => {
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(p).to.deep.equal(pos);
                  emitMessage.call(trader, 'Trader.trade-executed', {
                    type: 'tradeExecuted',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'sell',
                    price: '1030',
                    orderType: 'market',
                    tradeSize: '1.0',
                    remainingSize: '0.0'
                  } as TradeExecutedMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
                  expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
                  expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                  expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
                  done();
                })
                .catch((err: Error) => {
                  done(err);
                });
              expect(pos.inPosition()).to.equal(State.Active);
            })
            .catch((err: Error) => {
              done(err);
            });
        });
        it('should return Active if the exit market order trade has finalized', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            funds: '100',
            side: 'buy',
          })
            .then((p: LongPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);

              trader.placeOrder = placeOrderResolve({
                price: Big(1030),
                size: Big(1.0),
                side: 'sell',
                id: '1235',
                time: new Date(),
                productId: productId,
                status: 'pending',
                extra: 'none'
              });
              pos.exit({
                time: new Date(),
                type: 'placeOrder',
                productId: productId,
                orderType: 'market',
                funds: '100',
                side: 'sell',
              })
                .then((p: LongPosition) => {
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(p).to.deep.equal(pos);
                  emitMessage.call(trader, 'Trader.trade-executed', {
                    type: 'tradeExecuted',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'sell',
                    price: '1030',
                    orderType: 'market',
                    tradeSize: '1.0',
                    remainingSize: '0.0'
                  } as TradeExecutedMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  emitMessage.call(trader, 'Trader.trade-finalized', {
                    type: 'tradeFinalized',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'sell',
                    price: '1030',
                    remainingSize: '0.0',
                    reason: 'filled'
                  } as TradeFinalizedMessage)
                  expect(p.inPosition()).to.equal(State.Ready);
                  expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
                  expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
                  expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                  expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
                  done();
                })
                .catch((err: Error) => {
                  done(err);
                });
              expect(pos.inPosition()).to.equal(State.Active);
            })
            .catch((err: Error) => {
              done(err);
            });
        })
      })
      describe('Exit limit orders', () => {
        it('should return Active if there is a pending exit limit order request to the Exchange', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            funds: '100',
            side: 'buy',
          })
            .then((p: LongPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);

              trader.placeOrder = placeOrderResolve({
                price: Big(1030),
                size: Big(1.0),
                side: 'sell',
                id: '1235',
                time: new Date(),
                productId: productId,
                status: 'pending',
                extra: 'none'
              });

              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              pos.exit({
                time: new Date(),
                type: 'placeOrder',
                productId: productId,
                orderType: 'limit',
                price: '1000',
                funds: '100',
                side: 'sell',
              })
                .then((p: LongPosition) => {
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(p).to.deep.equal(pos);
                  expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
                  expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
                  expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                  expect(trader.listenerCount('Trader.order-placed')).to.equal(1);
                  done();
                })
                .catch((err: Error) => {
                  done(err);
                });
              expect(pos.inPosition()).to.equal(State.Active);
            })
            .catch((err: Error) => {
              done(err);
            });
        });
        it('should return Active if the limit order has been placed on the order book', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            funds: '100',
            side: 'buy',
          })
            .then((p: LongPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);

              trader.placeOrder = placeOrderResolve({
                price: Big(1030),
                size: Big(1.0),
                side: 'sell',
                id: '1235',
                time: new Date(),
                productId: productId,
                status: 'pending',
                extra: 'none'
              });
              pos.exit({
                time: new Date(),
                type: 'placeOrder',
                productId: productId,
                orderType: 'limit',
                price: '1000',
                funds: '100',
                side: 'sell',
              })
                .then((p: LongPosition) => {
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(p).to.deep.equal(pos);
                  emitMessage.call(trader, 'Trader.order-placed', {
                    type: 'myOrderPlaced',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'sell',
                    size: '1.0',
                    price: '1000',
                    orderType: 'limit',
                    tradeSize: '1.0',
                    remainingSize: '0.0',
                    sequence: 1
                  } as MyOrderPlacedMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
                  expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
                  expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                  expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
                  done();
                })
                .catch((err: Error) => {
                  done(err);
                });
              expect(pos.inPosition()).to.equal(State.Active);
            })
            .catch((err: Error) => {
              done(err);
            });
        });
        it('should return Active if the entry limit order trade has executed', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            funds: '100',
            side: 'buy',
          })
            .then((p: LongPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);

              trader.placeOrder = placeOrderResolve({
                price: Big(1030),
                size: Big(1.0),
                side: 'sell',
                id: '1235',
                time: new Date(),
                productId: productId,
                status: 'pending',
                extra: 'none'
              });
              pos.exit({
                time: new Date(),
                type: 'placeOrder',
                productId: productId,
                orderType: 'limit',
                price: '1030',
                funds: '100',
                side: 'sell',
              })
                .then((p: LongPosition) => {
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(p).to.deep.equal(pos);
                  emitMessage.call(trader, 'Trader.order-placed', {
                    type: 'myOrderPlaced',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'sell',
                    size: '1.0',
                    price: '1030',
                    orderType: 'limit',
                    tradeSize: '1.0',
                    remainingSize: '0.0',
                    sequence: 1
                  } as MyOrderPlacedMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  emitMessage.call(trader, 'Trader.trade-executed', {
                    type: 'tradeExecuted',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'sell',
                    price: '1030',
                    orderType: 'limit',
                    tradeSize: '1.0',
                    remainingSize: '0.0'
                  } as TradeExecutedMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
                  expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
                  expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                  expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
                  done();
                })
                .catch((err: Error) => {
                  done(err);
                });
              expect(pos.inPosition()).to.equal(State.Active);
            })
            .catch((err: Error) => {
              done(err);
            });
        });
        it('should return Ready if the entry limit order trade has finalized', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            funds: '100',
            side: 'buy',
          })
            .then((p: LongPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);

              trader.placeOrder = placeOrderResolve({
                price: Big(1030),
                size: Big(1.0),
                side: 'sell',
                id: '1235',
                time: new Date(),
                productId: productId,
                status: 'pending',
                extra: 'none'
              });
              pos.exit({
                time: new Date(),
                type: 'placeOrder',
                productId: productId,
                orderType: 'limit',
                price: '1030',
                funds: '100',
                side: 'sell',
              })
                .then((p: LongPosition) => {
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(p).to.deep.equal(pos);
                  emitMessage.call(trader, 'Trader.order-placed', {
                    type: 'myOrderPlaced',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'sell',
                    size: '1.0',
                    price: '1030',
                    orderType: 'limit',
                    tradeSize: '1.0',
                    remainingSize: '0.0',
                    sequence: 1
                  } as MyOrderPlacedMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  emitMessage.call(trader, 'Trader.trade-executed', {
                    type: 'tradeExecuted',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'sell',
                    price: '1030',
                    orderType: 'limit',
                    tradeSize: '1.0',
                    remainingSize: '0.0'
                  } as TradeExecutedMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  emitMessage.call(trader, 'Trader.trade-finalized', {
                    type: 'tradeFinalized',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'sell',
                    price: '1030',
                    remainingSize: '0.0',
                    reason: 'filled'
                  } as TradeFinalizedMessage)
                  expect(p.inPosition()).to.equal(State.Ready);
                  expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
                  expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
                  expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                  expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
                  done();
                })
                .catch((err: Error) => {
                  done(err);
                });
              expect(pos.inPosition()).to.equal(State.Active);
            })
            .catch((err: Error) => {
              done(err);
            });
        });
      });
      describe('Exit stop market orders', () => {
        it('should return Active if there is a pending entry market stop order request to the Exchange', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            funds: '100',
            side: 'buy',
          })
            .then((p: LongPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);

              trader.placeOrder = placeOrderResolve({
                price: Big(1030),
                size: Big(1.0),
                side: 'sell',
                id: '1235',
                time: new Date(),
                productId: productId,
                status: 'pending',
                extra: 'none'
              });
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              pos.exit({
                time: new Date(),
                type: 'placeOrder',
                productId: productId,
                orderType: 'market',
                funds: '100',
                side: 'sell',
                extra: {
                  stop: 'loss',
                  stopPrice: '1030'
                }
              })
                .then((p: LongPosition) => {
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(p).to.deep.equal(pos);
                  expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
                  expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
                  expect(trader.listenerCount('Trader.stop-active')).to.equal(1);
                  expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
                  done();
                })
                .catch((err: Error) => {
                  done(err);
                });
              expect(pos.inPosition()).to.equal(State.Active);
            })
            .catch((err: Error) => {
              done(err);
            });
        });
        it('should return Active if there is an active exit stop market order', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            funds: '100',
            side: 'buy',
          })
            .then((p: LongPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);

              trader.placeOrder = placeOrderResolve({
                price: Big(980),
                size: Big(1.0),
                side: 'sell',
                id: '1235',
                time: new Date(),
                productId: productId,
                status: 'pending',
                extra: 'none'
              });
              pos.exit({
                time: new Date(),
                type: 'placeOrder',
                productId: productId,
                orderType: 'market',
                size: '1.0',
                side: 'sell',
                extra: {
                  stop: 'loss',
                  stopPrice: '990'
                }
              })
                .then((p: LongPosition) => {
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(p).to.deep.equal(pos);
                  emitMessage.call(trader, 'Trader.stop-active', {
                    type: 'stopActive',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    funds: '100',
                    side: 'sell',
                    size: '1.0',
                    price: null,
                    orderType: 'market',
                    stopType: 'loss',
                    private: true,
                    stopPrice: '990',
                    takerFeeRate: '0.25',
                    sequence: 1
                  } as StopActiveMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
                  expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
                  expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                  expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
                  done();
                })
                .catch((err: Error) => {
                  done(err);
                });
              expect(pos.inPosition()).to.equal(State.Active);
            })
            .catch((err: Error) => {
              done(err);
            });
        });
        it('should return Active if the entry stop market order has been triggered and the trade has executed', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            funds: '100',
            side: 'buy',
          })
            .then((p: LongPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);

              trader.placeOrder = placeOrderResolve({
                price: Big(980),
                size: Big(1.0),
                side: 'sell',
                id: '1235',
                time: new Date(),
                productId: productId,
                status: 'pending',
                extra: 'none'
              });
              pos.exit({
                time: new Date(),
                type: 'placeOrder',
                productId: productId,
                orderType: 'market',
                size: '1.0',
                side: 'sell',
                extra: {
                  stop: 'loss',
                  stopPrice: '990'
                }
              })
                .then((p: LongPosition) => {
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(p).to.deep.equal(pos);
                  emitMessage.call(trader, 'Trader.stop-active', {
                    type: 'stopActive',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    funds: '100',
                    side: 'sell',
                    size: '1.0',
                    price: null,
                    orderType: 'market',
                    stopType: 'loss',
                    private: true,
                    stopPrice: '990',
                    takerFeeRate: '0.25',
                    sequence: 1
                  } as StopActiveMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  emitMessage.call(trader, 'Trader.trade-executed', {
                    type: 'tradeExecuted',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'sell',
                    price: '980',
                    orderType: 'market',
                    tradeSize: '1.0',
                    remainingSize: '0.0'
                  } as TradeExecutedMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
                  expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
                  expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                  expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
                  done();
                })
                .catch((err: Error) => {
                  done(err);
                });
              expect(pos.inPosition()).to.equal(State.Active);
            })
            .catch((err: Error) => {
              done(err);
            });
        });
        it('should return Active if the entry stop market order has been triggered and the trade has executed', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            funds: '100',
            side: 'buy',
          })
            .then((p: LongPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);

              trader.placeOrder = placeOrderResolve({
                price: Big(980),
                size: Big(1.0),
                side: 'sell',
                id: '1235',
                time: new Date(),
                productId: productId,
                status: 'pending',
                extra: 'none'
              });
              pos.exit({
                time: new Date(),
                type: 'placeOrder',
                productId: productId,
                orderType: 'market',
                size: '1.0',
                side: 'sell',
                extra: {
                  stop: 'loss',
                  stopPrice: '990'
                }
              })
                .then((p: LongPosition) => {
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(p).to.deep.equal(pos);
                  emitMessage.call(trader, 'Trader.stop-active', {
                    type: 'stopActive',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    funds: '100',
                    side: 'sell',
                    size: '1.0',
                    price: null,
                    orderType: 'market',
                    stopType: 'loss',
                    private: true,
                    stopPrice: '990',
                    takerFeeRate: '0.25',
                    sequence: 1
                  } as StopActiveMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  emitMessage.call(trader, 'Trader.trade-executed', {
                    type: 'tradeExecuted',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'sell',
                    price: '980',
                    orderType: 'market',
                    tradeSize: '1.0',
                    remainingSize: '0.0'
                  } as TradeExecutedMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  emitMessage.call(trader, 'Trader.trade-finalized', {
                    type: 'tradeFinalized',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'sell',
                    price: '980',
                    remainingSize: '0.0',
                    reason: 'filled'
                  } as TradeFinalizedMessage)
                  expect(p.inPosition()).to.equal(State.Ready);
                  expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
                  expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
                  expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                  expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
                  done();
                })
                .catch((err: Error) => {
                  done(err);
                });
              expect(pos.inPosition()).to.equal(State.Active);
            })
            .catch((err: Error) => {
              done(err);
            });
        });
      });
      describe('Exit stop limit orders', () => {
        it('should return Active if there is a pending exit limit stop order request to the Exchange', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            funds: '100',
            side: 'buy',
          })
            .then((p: LongPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);

              trader.placeOrder = placeOrderResolve({
                price: Big(1030),
                size: Big(1.0),
                side: 'sell',
                id: '1235',
                time: new Date(),
                productId: productId,
                status: 'pending',
                extra: 'none'
              });
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              pos.exit({
                time: new Date(),
                type: 'placeOrder',
                productId: productId,
                orderType: 'limit',
                price: '1000',
                size: '1.0',
                side: 'sell',
                extra: {
                  stop: 'loss',
                  stopPrice: '990'
                }
              })
                .then((p: LongPosition) => {
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(p).to.deep.equal(pos);
                  expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
                  expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
                  expect(trader.listenerCount('Trader.stop-active')).to.equal(1);
                  expect(trader.listenerCount('Trader.order-placed')).to.equal(1);
                  done();
                })
                .catch((err: Error) => {
                  done(err);
                });
              expect(pos.inPosition()).to.equal(State.Active);
            })
            .catch((err: Error) => {
              done(err);
            });
        });
        it('should return Active if there is an active stop limit order', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            funds: '100',
            side: 'buy',
          })
            .then((p: LongPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);

              trader.placeOrder = placeOrderResolve({
                price: Big(1030),
                size: Big(1.0),
                side: 'sell',
                id: '1235',
                time: new Date(),
                productId: productId,
                status: 'pending',
                extra: 'none'
              });
              pos.exit({
                time: new Date(),
                type: 'placeOrder',
                productId: productId,
                orderType: 'limit',
                price: '1000',
                size: '1.0',
                side: 'sell',
                extra: {
                  stop: 'loss',
                  stopPrice: '990'
                }
              })
                .then((p: LongPosition) => {
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(p).to.deep.equal(pos);
                  emitMessage.call(trader, 'Trader.stop-active', {
                    type: 'stopActive',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    funds: '100',
                    side: 'sell',
                    size: '1.0',
                    price: null,
                    orderType: 'limit',
                    stopType: 'loss',
                    private: true,
                    stopPrice: '990',
                    takerFeeRate: '0.25',
                    sequence: 1
                  } as StopActiveMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
                  expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
                  expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                  expect(trader.listenerCount('Trader.order-placed')).to.equal(1);
                  done();
                })
                .catch((err: Error) => {
                  done(err);
                });
              expect(pos.inPosition()).to.equal(State.Active);
            })
            .catch((err: Error) => {
              done(err);
            });
        });
        it('should return Active if the exit stop limit order has been triggered and is now on the order book', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            funds: '100',
            side: 'buy',
          })
            .then((p: LongPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);

              trader.placeOrder = placeOrderResolve({
                price: Big(1030),
                size: Big(1.0),
                side: 'sell',
                id: '1235',
                time: new Date(),
                productId: productId,
                status: 'pending',
                extra: 'none'
              });
              pos.exit({
                time: new Date(),
                type: 'placeOrder',
                productId: productId,
                orderType: 'limit',
                price: '1000',
                size: '1.0',
                side: 'sell',
                extra: {
                  stop: 'loss',
                  stopPrice: '990'
                }
              })
                .then((p: LongPosition) => {
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(p).to.deep.equal(pos);
                  emitMessage.call(trader, 'Trader.stop-active', {
                    type: 'stopActive',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    funds: '100',
                    side: 'sell',
                    size: '1.0',
                    price: null,
                    orderType: 'limit',
                    stopType: 'loss',
                    private: true,
                    stopPrice: '990',
                    takerFeeRate: '0.25',
                    sequence: 1
                  } as StopActiveMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  emitMessage.call(trader, 'Trader.order-placed', {
                    type: 'myOrderPlaced',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'sell',
                    size: '1.0',
                    price: '990',
                    orderType: 'limit',
                    tradeSize: '1.0',
                    remainingSize: '0.0',
                    sequence: 1
                  } as MyOrderPlacedMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
                  expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
                  expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                  expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
                  done();
                })
                .catch((err: Error) => {
                  done(err);
                });
              expect(pos.inPosition()).to.equal(State.Active);
            })
            .catch((err: Error) => {
              done(err);
            });
        });
        it('should return Active if the entry stop limit order trade has executed', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            funds: '100',
            side: 'buy',
          })
            .then((p: LongPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);

              trader.placeOrder = placeOrderResolve({
                price: Big(1030),
                size: Big(1.0),
                side: 'sell',
                id: '1235',
                time: new Date(),
                productId: productId,
                status: 'pending',
                extra: 'none'
              });
              pos.exit({
                time: new Date(),
                type: 'placeOrder',
                productId: productId,
                orderType: 'limit',
                price: '1000',
                size: '1.0',
                side: 'sell',
                extra: {
                  stop: 'loss',
                  stopPrice: '990'
                }
              })
                .then((p: LongPosition) => {
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(p).to.deep.equal(pos);
                  emitMessage.call(trader, 'Trader.stop-active', {
                    type: 'stopActive',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    funds: '100',
                    side: 'sell',
                    size: '1.0',
                    price: null,
                    orderType: 'limit',
                    stopType: 'loss',
                    private: true,
                    stopPrice: '990',
                    takerFeeRate: '0.25',
                    sequence: 1
                  } as StopActiveMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  emitMessage.call(trader, 'Trader.order-placed', {
                    type: 'myOrderPlaced',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'sell',
                    size: '1.0',
                    price: '990',
                    orderType: 'limit',
                    tradeSize: '1.0',
                    remainingSize: '0.0',
                    sequence: 1
                  } as MyOrderPlacedMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  emitMessage.call(trader, 'Trader.trade-executed', {
                    type: 'tradeExecuted',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'sell',
                    price: '990',
                    orderType: 'limit',
                    tradeSize: '1.0',
                    remainingSize: '0.0'
                  } as TradeExecutedMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
                  expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
                  expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                  expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
                  done();
                })
                .catch((err: Error) => {
                  done(err);
                });
              expect(pos.inPosition()).to.equal(State.Active);
            })
            .catch((err: Error) => {
              done(err);
            });
        });
        it('should return Ready if the entry stop limit order trade has finalized', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            funds: '100',
            side: 'buy',
          })
            .then((p: LongPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);

              trader.placeOrder = placeOrderResolve({
                price: Big(1030),
                size: Big(1.0),
                side: 'sell',
                id: '1235',
                time: new Date(),
                productId: productId,
                status: 'pending',
                extra: 'none'
              });
              pos.exit({
                time: new Date(),
                type: 'placeOrder',
                productId: productId,
                orderType: 'limit',
                price: '1000',
                size: '1.0',
                side: 'sell',
                extra: {
                  stop: 'loss',
                  stopPrice: '990'
                }
              })
                .then((p: LongPosition) => {
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(p).to.deep.equal(pos);
                  emitMessage.call(trader, 'Trader.stop-active', {
                    type: 'stopActive',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    funds: '100',
                    side: 'sell',
                    size: '1.0',
                    price: null,
                    orderType: 'limit',
                    stopType: 'loss',
                    private: true,
                    stopPrice: '990',
                    takerFeeRate: '0.25',
                    sequence: 1
                  } as StopActiveMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  emitMessage.call(trader, 'Trader.order-placed', {
                    type: 'myOrderPlaced',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'sell',
                    size: '1.0',
                    price: '990',
                    orderType: 'limit',
                    tradeSize: '1.0',
                    remainingSize: '0.0',
                    sequence: 1
                  } as MyOrderPlacedMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  emitMessage.call(trader, 'Trader.trade-executed', {
                    type: 'tradeExecuted',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'sell',
                    price: '990',
                    orderType: 'limit',
                    tradeSize: '1.0',
                    remainingSize: '0.0'
                  } as TradeExecutedMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  emitMessage.call(trader, 'Trader.trade-finalized', {
                    type: 'tradeFinalized',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'sell',
                    price: '990',
                    remainingSize: '0.0',
                    reason: 'filled'
                  } as TradeFinalizedMessage)
                  expect(p.inPosition()).to.equal(State.Ready);
                  expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
                  expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
                  expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                  expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
                  done();
                })
                .catch((err: Error) => {
                  done(err);
                });
              expect(pos.inPosition()).to.equal(State.Active);
            })
            .catch((err: Error) => {
              done(err);
            });
        });
      });
      describe('Failed Order Placement', () => {
        it('should return Ready if the previous enter order failed to place', (done) => {
          trader.placeOrder = placeOrderReject(new PlaceOrderFailError('error'));
          let pos = new LongPosition(trader, config.exchangeAPI, {
            maxRetriesOnOrderFail: 3,
            waitForFundsToClear: false,
            retryLimit: 10,
            retryInterval: 100
          });
          count = 0;
          expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
          expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
          expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
          expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            funds: '100',
            side: 'buy',
          })
            .then((p: LongPosition) => {
              done(assert(false));
            })
            .catch((err: Error) => {
              expect(count).to.equal(3);
              expect(pos.inPosition()).to.equal(State.Ready);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0); 
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              done();
            })
          expect(pos.inPosition()).to.equal(State.Pending);
        });
        it('should return Active if the previous exit order failed to place', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            funds: '100',
            side: 'buy',
          })
            .then((p: LongPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);

              trader.placeOrder = placeOrderReject(new PlaceOrderFailError('failed'));
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              pos.exit({
                time: new Date(),
                type: 'placeOrder',
                productId: productId,
                orderType: 'market',
                size: '1.0',
                side: 'sell',
              })
                .then((p: LongPosition) => {
                  done(assert(false));
                })
                .catch((err) => {
                  expect(pos.inPosition()).to.equal(State.Active);
                  expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
                  expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
                  expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                  expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
                  done();
                });
            })
            .catch((err) => {
              done(err);
            });
        });
        it('should handle a limit order executing immediately', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'received',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
          expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
          expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
          expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'limit',
            price: '1000',
            size: '1.0',
            side: 'buy',
          })
            .then((p: LongPosition) => {
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(1);
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1000',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
        });
        it('should handle a stop order executing immediately', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'received',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
          expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
          expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
          expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'limit',
            price: '1000',
            size: '1.0',
            side: 'buy',
            extra: {
              stop: 'entry',
              stopPrice: '1000'
            }
          })
            .then((p: LongPosition) => {
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(1);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(1);
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.stop-active', {
                type: 'stopActive',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                funds: '100',
                side: 'sell',
                size: '1.0',
                price: null,
                orderType: 'limit',
                stopType: 'loss',
                private: true,
                stopPrice: '990',
                takerFeeRate: '0.25',
                sequence: 1
              } as StopActiveMessage)
              expect(p.inPosition()).to.equal(State.Pending);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(1);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1000',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
        });
        it('should handle auto-filling orders', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          let order = {
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            side: 'buy',
          };
          reqOrder = null;
          expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
          expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
          expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
          expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
          pos.enter(order)
            .then((p: LongPosition) => {
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              expect(p.inPosition()).to.equal(State.Pending);
              expect(order).not.haveOwnProperty('size');
              expect(order).not.haveOwnProperty('funds');
              expect(reqOrder).to.haveOwnProperty('funds');
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
        });
        it('should handle also work when wait for funds is false', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'received',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, {
            maxRetriesOnOrderFail: 3,
            waitForFundsToClear: false,
            retryLimit: 10,
            retryInterval: 100
          });
          expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
          expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
          expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
          expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            size: '1.0',
            side: 'buy',
            extra: {
              stop: 'entry',
              stopPrice: '1001'
            }
          })
            .then((p: LongPosition) => {
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(1);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.stop-active', {
                type: 'stopActive',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                funds: '1.0',
                side: 'buy',
                size: '1.0',
                price: '1001',
                orderType: 'market',
                stopType: 'entry',
                private: true,
                stopPrice: '1001',
                takerFeeRate: '0.25',
                sequence: 1
              } as StopActiveMessage)
              expect(p.inPosition()).to.equal(State.Pending);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1002',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage);
              expect(p.inPosition()).to.equal(State.Active);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
          expect(pos.inPosition()).to.equal(State.Pending);
        });
        it('should remove all listers', () => {
          // we're testing this throughout all the other tests
          expect(true).to.equal(true);
        });
        it('should handle limit order being canceled', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'received',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'limit',
            price: '1000',
            size: '1.0',
            side: 'buy',
          })
            .then((p: LongPosition) => {
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(1);
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.order-placed', {
                type: 'myOrderPlaced',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                size: '1.0',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0',
                sequence: 1
              } as MyOrderPlacedMessage)
              expect(p.inPosition()).to.equal(State.Pending);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                remainingSize: '0.0',
                reason: 'canceled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Ready);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
        });
        it('should handle stop order being canceled', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'buy',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'received',
            extra: 'none'
          });
          let pos = new LongPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            size: '1.0',
            side: 'buy',
            extra: {
              stop: 'entry',
              stopPrice: '1000'
            }
          })
            .then((p: LongPosition) => {
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(1);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.stop-active', {
                type: 'stopActive',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                funds: '1.0',
                side: 'buy',
                size: '1.0',
                price: '1002',
                orderType: 'market',
                stopType: 'entry',
                private: true,
                stopPrice: '1001',
                takerFeeRate: '0.25',
                sequence: 1
              } as StopActiveMessage)
              expect(p.inPosition()).to.equal(State.Pending);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'buy',
                price: '1001',
                remainingSize: '0.0',
                reason: 'canceled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Ready);             
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
        });
      });
    });

    describe('Enter()', () => {
      describe('Auto-fill order size or funds', () => {

      });
    });

    describe('Exit()', () => {
    });

  })
  describe('Short Positions', () => {

    describe('CancelPendingEntries()', () => {

      beforeEach(() => {
        trader = new Trader(config);
      });

      it('should throw an error if there is an active position', (done) => {
        trader.placeOrder = placeOrderResolve({
          price: Big(1000),
          size: Big(1.0),
          side: 'sell',
          id: '1234',
          time: new Date(),
          productId: productId,
          status: 'pending',
          extra: 'none'
        });

        trader.cancelOrder = cancelOrderReject(new Error('failed'));

        let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
        pos.enter({
          time: new Date(),
          type: 'placeOrder',
          productId: productId,
          orderType: 'market',
          size: '1.0',
          side: 'sell',
        })
          .then((p: ShortPosition) => {
            expect(p.inPosition()).to.equal(State.Pending);
            expect(p).to.deep.equal(pos);
            emitMessage.call(trader, 'Trader.trade-executed', {
              type: 'tradeExecuted',
              time: new Date(),
              productId: productId,
              orderId: '1234',
              side: 'sell',
              price: '1001',
              orderType: 'market',
              tradeSize: '1.0',
              remainingSize: '0.0'
            } as TradeExecutedMessage)
            expect(p.inPosition()).to.equal(State.Active);

            p.cancelPendingEntry()
              .then(() => {
                done(new Error('failed'));
              })
              .catch((err) => {
                expect(err).to.be.an('error');
                expect(err.name).to.equal('CancelPendingEntryError');
                done();
              });
          })
          .catch((err) => {
            done(err);
          })
      });
      it('should succeed if the position is in ready state', (done) => {
        trader.placeOrder = placeOrderResolve({
          price: Big(1000),
          size: Big(1.0),
          side: 'sell',
          id: '1234',
          time: new Date(),
          productId: productId,
          status: 'pending',
          extra: 'none'
        });

        trader.cancelOrder = cancelOrderReject(new Error('failed'));

        let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
        expect(pos.inPosition()).to.equal(State.Ready);
        pos.cancelPendingEntry()
          .then(() => {
            expect(pos.inPosition()).to.equal(State.Ready);
            done();

          })
          .catch((err) => {
            done(err);
          });
      });
      it('should handle successive calls', (done) => {
        trader.placeOrder = placeOrderResolve({
          price: Big(1000),
          size: Big(1.0),
          side: 'sell',
          id: '1234',
          time: new Date(),
          productId: productId,
          status: 'pending',
          extra: 'none'
        });

        trader.cancelOrder = cancelOrderReject(new Error('failed'));

        let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
        expect(pos.inPosition()).to.equal(State.Ready);
        pos.cancelPendingEntry()
          .then(() => {
            expect(pos.inPosition()).to.equal(State.Ready);
            pos.cancelPendingEntry()
              .then(() => {
                expect(pos.inPosition()).to.equal(State.Ready);
                done();
              })
              .catch((err) => {
                done(err);
              });
          })
          .catch((err) => {
            done(err);
          });
      });
      it('should handle parallel calls', (done) => {
        trader.placeOrder = placeOrderResolve({
          price: Big(1000),
          size: Big(1.0),
          side: 'sell',
          id: '1234',
          time: new Date(),
          productId: productId,
          status: 'pending',
          extra: 'none'
        });

        trader.cancelOrder = cancelOrderReject(new Error('failed'));

        let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
        expect(pos.inPosition()).to.equal(State.Ready);
        let first = false;
        let second = false;
        pos.cancelPendingEntry()
          .then(() => {
            expect(pos.inPosition()).to.equal(State.Ready);
            if (second) {
              done();
            } else {
              first = true;
            }
          })
          .catch((err) => {
            done(err);
          });
        pos.cancelPendingEntry()
          .then(() => {
            expect(pos.inPosition()).to.equal(State.Ready);
            if (first) {
              done();
            } else {
              second = true;
            }
          })
          .catch((err) => {
            done(err);
          });
      });
      it('should cancel any pending orders', (done) => {
        trader.placeOrder = placeOrderResolve({
          price: Big(1000),
          size: Big(1.0),
          side: 'sell',
          id: '1234',
          time: new Date(),
          productId: productId,
          status: 'pending',
          extra: 'none'
        });

        trader.cancelOrder = cancelOrderResolve();

        let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
        pos.enter({
          time: new Date(),
          type: 'placeOrder',
          productId: productId,
          orderType: 'limit',
          size: '1.0',
          side: 'sell',
          price: '1000'
        })
          .then((p: ShortPosition) => {
            expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
            expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
            expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
            expect(trader.listenerCount('Trader.order-placed')).to.equal(1);
            expect(p.inPosition()).to.equal(State.Pending);
            expect(p).to.deep.equal(pos);
            emitMessage.call(trader, 'Trader.order-placed', {
              type: 'myOrderPlaced',
              time: new Date(),
              productId: productId,
              orderId: '1234',
              side: 'sell',
              size: '1.0',
              price: '1001',
              orderType: 'market',
              tradeSize: '1.0',
              remainingSize: '0.0',
              sequence: 1
            } as MyOrderPlacedMessage)
            expect(p.inPosition()).to.equal(State.Pending);
            expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
            expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
            expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
            expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
            p.cancelPendingEntry()
              .then(() => {
                expect(p.inPosition()).to.equal(State.Ready);
                expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
                expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
                expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
                done();
              })
              .catch((err) => {
                done(err);
              });
          })
          .catch((err) => {
            done(err);
          })
      });
      it('should wait for the cancel orders to be canceled', (done) => {
        trader.placeOrder = placeOrderResolve({
          price: Big(1000),
          size: Big(1.0),
          side: 'sell',
          id: '1234',
          time: new Date(),
          productId: productId,
          status: 'pending',
          extra: 'none'
        });

        trader.cancelOrder = cancelOrderResolve();

        let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
        pos.enter({
          time: new Date(),
          type: 'placeOrder',
          productId: productId,
          orderType: 'limit',
          size: '1.0',
          side: 'sell',
          price: '1000'
        })
          .then((p: ShortPosition) => {
            expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
            expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
            expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
            expect(trader.listenerCount('Trader.order-placed')).to.equal(1);
            expect(p.inPosition()).to.equal(State.Pending);
            expect(p).to.deep.equal(pos);
            emitMessage.call(trader, 'Trader.order-placed', {
              type: 'myOrderPlaced',
              time: new Date(),
              productId: productId,
              orderId: '1234',
              side: 'sell',
              size: '1.0',
              price: '1001',
              orderType: 'limit',
              tradeSize: '1.0',
              remainingSize: '0.0',
              sequence: 1
            } as MyOrderPlacedMessage)
            expect(p.inPosition()).to.equal(State.Pending);
            expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
            expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
            expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
            expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
            p.cancelPendingEntry()
              .then(() => {
                expect(p.inPosition()).to.equal(State.Ready);
                expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
                expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
                expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
                done();
              })
              .catch((err) => {
                done(err);
              });
            expect(p.inPosition()).to.equal(State.Pending);
          })
          .catch((err) => {
            done(err);
          })
      });
      it('should throw an error if the order cannot be canceled', (done) => {
        trader.placeOrder = placeOrderResolve({
          price: Big(1000),
          size: Big(1.0),
          side: 'sell',
          id: '1234',
          time: new Date(),
          productId: productId,
          status: 'pending',
          extra: 'none'
        });

        trader.cancelOrder = cancelOrderReject(new Error('failed'));

        let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
        pos.enter({
          time: new Date(),
          type: 'placeOrder',
          productId: productId,
          orderType: 'limit',
          size: '1.0',
          side: 'sell',
          price: '1000'
        })
          .then((p: ShortPosition) => {
            expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
            expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
            expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
            expect(trader.listenerCount('Trader.order-placed')).to.equal(1);
            expect(p.inPosition()).to.equal(State.Pending);
            expect(p).to.deep.equal(pos);
            emitMessage.call(trader, 'Trader.order-placed', {
              type: 'myOrderPlaced',
              time: new Date(),
              productId: productId,
              orderId: '1234',
              side: 'sell',
              size: '1.0',
              price: '1001',
              orderType: 'market',
              tradeSize: '1.0',
              remainingSize: '0.0',
              sequence: 1
            } as MyOrderPlacedMessage)
            expect(p.inPosition()).to.equal(State.Pending);
            expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
            expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
            expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
            expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
            p.cancelPendingEntry()
              .then(() => {
                done(assert(false));
              })
              .catch((err) => {
                expect(err).to.be.an('error');
                expect(err.name).to.equal('CancelPendingEntryError');
                expect(p.inPosition()).to.equal(State.Pending);
                expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
                expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
                expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
                done();
              });
            expect(p.inPosition()).to.equal(State.Pending);
          })
          .catch((err) => {
            done(err);
          })
      });
      it('should wait for the request to complete if the state is pending but dont have an order id');
    });

    describe('InPosition()', () => {

      beforeEach(() => {
        trader = new Trader(config);
      });

      describe('Entry Market Orders', () => {
        it('should return Ready if there is no active position', () => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: 'id',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, {
            maxRetriesOnOrderFail: 3,
            waitForFundsToClear: false,
            retryLimit: 10,
            retryInterval: 100
          });

          expect(pos.inPosition()).to.equal(State.Ready);

        });
        it('should return Pending if there is a pending entry market order request to the Exchange', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: 'id',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, {
            maxRetriesOnOrderFail: 3,
            waitForFundsToClear: false,
            retryLimit: 10,
            retryInterval: 100
          });
          count = 0;
          expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
          expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
          expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
          expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            size: '1.0',
            side: 'sell',
          })
            .then((p: ShortPosition) => {
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              expect(count).to.equal(1);
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
          expect(pos.inPosition()).to.equal(State.Pending);
        });

        it('should return Active if the entry market order trade has executed', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            size: '1.0',
            side: 'sell',
          })
            .then((p: ShortPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
        });
      });
      describe('Entry limit orders', () => {
        it('should return Pending if there is a pending entry limit order request to the Exchange', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, {
            maxRetriesOnOrderFail: 3,
            waitForFundsToClear: false,
            retryLimit: 10,
            retryInterval: 100
          });
          count = 0;
          expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
          expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
          expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
          expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'limit',
            price: '1000',
            size: '1.0',
            side: 'sell',
          })
            .then((p: ShortPosition) => {
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(1);
              expect(count).to.equal(1);
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
          expect(pos.inPosition()).to.equal(State.Pending);
        });
        it('should return Pending if the limit order has been placed on the order book', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'received',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'limit',
            price: '1000',
            size: '1.0',
            side: 'sell',
          })
            .then((p: ShortPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.order-placed', {
                type: 'myOrderPlaced',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                size: '1.0',
                price: '1001',
                orderType: 'limit',
                tradeSize: '1.0',
                remainingSize: '0.0',
                sequence: 1
              } as MyOrderPlacedMessage)
              expect(p.inPosition()).to.equal(State.Pending);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
        });
        it('should return Active if the entry limit order trade has executed', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'received',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'limit',
            price: '1000',
            size: '1.0',
            side: 'sell',
          })
            .then((p: ShortPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.order-placed', {
                type: 'myOrderPlaced',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                size: '1.0',
                price: '1001',
                orderType: 'limit',
                tradeSize: '1.0',
                remainingSize: '0.0',
                sequence: 1
              } as MyOrderPlacedMessage)
              expect(p.inPosition()).to.equal(State.Pending);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                orderType: 'limit',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage);
              expect(p.inPosition()).to.equal(State.Active);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
        });
        it('should return Active if the entry limit order trade has finalized', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'received',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'limit',
            price: '1000',
            size: '1.0',
            side: 'sell',
          })
            .then((p: ShortPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.order-placed', {
                type: 'myOrderPlaced',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                size: '1.0',
                price: '1001',
                orderType: 'limit',
                tradeSize: '1.0',
                remainingSize: '0.0',
                sequence: 1
              } as MyOrderPlacedMessage)
              expect(p.inPosition()).to.equal(State.Pending);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                orderType: 'limit',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage);
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
        });
      });
      describe('Entry stop market orders', () => {
        it('should return Pending if there is a pending entry market stop order request to the Exchange', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'received',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
          expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
          expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
          expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            size: '1.0',
            side: 'sell',
            extra: {
              stop: 'loss',
              stopPrice: '1001'
            }
          })
            .then((p: ShortPosition) => {
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(1);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
          expect(pos.inPosition()).to.equal(State.Pending);
        });
        it('should return Pending if there is an active stop order', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'received',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            size: '1.0',
            side: 'sell',
            extra: {
              stop: 'loss',
              stopPrice: '1001'
            }
          })
            .then((p: ShortPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.stop-active', {
                type: 'stopActive',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                funds: '1.0',
                side: 'sell',
                size: '1.0',
                price: '1002',
                orderType: 'market',
                stopType: 'loss',
                private: true,
                stopPrice: '1001',
                takerFeeRate: '0.25',
                sequence: 1
              } as StopActiveMessage)
              expect(p.inPosition()).to.equal(State.Pending);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
          expect(pos.inPosition()).to.equal(State.Pending);
        });
        it('should return Active if the entry stop market order has been triggered and the trade has executed', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'received',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            size: '1.0',
            side: 'sell',
            extra: {
              stop: 'loss',
              stopPrice: '1001'
            }
          })
            .then((p: ShortPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.stop-active', {
                type: 'stopActive',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                funds: '1.0',
                side: 'sell',
                size: '1.0',
                price: '1001',
                orderType: 'market',
                stopType: 'loss',
                private: true,
                stopPrice: '1001',
                takerFeeRate: '0.25',
                sequence: 1
              } as StopActiveMessage)
              expect(p.inPosition()).to.equal(State.Pending);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1002',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage);
              expect(p.inPosition()).to.equal(State.Active);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
          expect(pos.inPosition()).to.equal(State.Pending);
        });
        it('should return Active if the entry stop market order has been triggered and the trade has finalized', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'received',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            size: '1.0',
            side: 'sell',
            extra: {
              stop: 'loss',
              stopPrice: '1001'
            }
          })
            .then((p: ShortPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.stop-active', {
                type: 'stopActive',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                funds: '1.0',
                side: 'sell',
                size: '1.0',
                price: '1001',
                orderType: 'market',
                stopType: 'loss',
                private: true,
                stopPrice: '1001',
                takerFeeRate: '0.25',
                sequence: 1
              } as StopActiveMessage)
              expect(p.inPosition()).to.equal(State.Pending);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1002',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage);
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1002',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
          expect(pos.inPosition()).to.equal(State.Pending);
        });
      });
      describe('Entry stop limit orders', () => {
        it('should return Pending if there is a pending entry limit stop order request to the Exchange', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, {
            maxRetriesOnOrderFail: 3,
            waitForFundsToClear: false,
            retryLimit: 10,
            retryInterval: 100
          });
          count = 0;
          expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
          expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
          expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
          expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'limit',
            price: '1000',
            size: '1.0',
            side: 'sell',
            extra: {
              stop: 'loss',
              stopPrice: '1001'
            }
          })
            .then((p: ShortPosition) => {
              expect(count).to.equal(1);
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(1);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(1);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
          expect(pos.inPosition()).to.equal(State.Pending);
        });
        it('should return Pending if there is an active stop limit order', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'received',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'limit',
            price: '1000',
            size: '1.0',
            side: 'sell',
            extra: {
              stop: 'loss',
              stopPrice: '1001'
            }
          })
            .then((p: ShortPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.stop-active', {
                type: 'stopActive',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                funds: '1.0',
                side: 'sell',
                size: '1.0',
                price: '1002',
                orderType: 'limit',
                stopType: 'loss',
                private: true,
                stopPrice: '1001',
                takerFeeRate: '0.25',
                sequence: 1
              } as StopActiveMessage)
              expect(p.inPosition()).to.equal(State.Pending);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(1);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
          expect(pos.inPosition()).to.equal(State.Pending);
        });
        it('should return Pending if the entry stop limit order has been triggered and is now on the order book', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'received',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'limit',
            price: '1000',
            size: '1.0',
            side: 'sell',
            extra: {
              stop: 'loss',
              stopPrice: '1001'
            }
          })
            .then((p: ShortPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.stop-active', {
                type: 'stopActive',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                funds: '1.0',
                side: 'sell',
                size: '1.0',
                price: '1002',
                orderType: 'limit',
                stopType: 'loss',
                private: true,
                stopPrice: '1001',
                takerFeeRate: '0.25',
                sequence: 1
              } as StopActiveMessage)
              expect(p.inPosition()).to.equal(State.Pending);
              emitMessage.call(trader, 'Trader.order-placed', {
                type: 'myOrderPlaced',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                size: '1.0',
                price: '1000',
                orderType: 'limit',
                tradeSize: '1.0',
                remainingSize: '0.0',
                sequence: 1
              } as MyOrderPlacedMessage)
              expect(p.inPosition()).to.equal(State.Pending);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
          expect(pos.inPosition()).to.equal(State.Pending);
        });
        it('should return Active if the entry stop limit order trade has executed', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'received',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'limit',
            price: '1000',
            size: '1.0',
            side: 'sell',
            extra: {
              stop: 'loss',
              stopPrice: '1001'
            }
          })
            .then((p: ShortPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.stop-active', {
                type: 'stopActive',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                funds: '1.0',
                side: 'sell',
                size: '1.0',
                price: '1002',
                orderType: 'limit',
                stopType: 'loss',
                private: true,
                stopPrice: '1001',
                takerFeeRate: '0.25',
                sequence: 1
              } as StopActiveMessage)
              expect(p.inPosition()).to.equal(State.Pending);
              emitMessage.call(trader, 'Trader.order-placed', {
                type: 'myOrderPlaced',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                size: '1.0',
                price: '1000',
                orderType: 'limit',
                tradeSize: '1.0',
                remainingSize: '0.0',
                sequence: 1
              } as MyOrderPlacedMessage)
              expect(p.inPosition()).to.equal(State.Pending);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1000',
                orderType: 'limit',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage);
              expect(p.inPosition()).to.equal(State.Active);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
          expect(pos.inPosition()).to.equal(State.Pending);
        });
        it('should return Active if the entry stop limit order trade has finalized', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'received',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'limit',
            price: '1000',
            size: '1.0',
            side: 'sell',
            extra: {
              stop: 'loss',
              stopPrice: '1001'
            }
          })
            .then((p: ShortPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.stop-active', {
                type: 'stopActive',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                funds: '1.0',
                side: 'sell',
                size: '1.0',
                price: '1002',
                orderType: 'limit',
                stopType: 'loss',
                private: true,
                stopPrice: '1001',
                takerFeeRate: '0.25',
                sequence: 1
              } as StopActiveMessage)
              expect(p.inPosition()).to.equal(State.Pending);
              emitMessage.call(trader, 'Trader.order-placed', {
                type: 'myOrderPlaced',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                size: '1.0',
                price: '1000',
                orderType: 'limit',
                tradeSize: '1.0',
                remainingSize: '0.0',
                sequence: 1
              } as MyOrderPlacedMessage)
              expect(p.inPosition()).to.equal(State.Pending);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1000',
                orderType: 'limit',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage);
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1000',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
          expect(pos.inPosition()).to.equal(State.Pending);
        });
      });
      describe('Exit Market Orders', () => {
        it('should return Active if there is a pending exit market order request to the Exchange', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            size: '1.0',
            side: 'sell',
          })
            .then((p: ShortPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);

              trader.placeOrder = placeOrderResolve({
                price: Big(1030),
                size: Big(1.0),
                side: 'buy',
                id: '1235',
                time: new Date(),
                productId: productId,
                status: 'pending',
                extra: 'none'
              });
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              pos.exit({
                time: new Date(),
                type: 'placeOrder',
                productId: productId,
                orderType: 'market',
                size: '1.0',
                side: 'buy',
              })
                .then((p: ShortPosition) => {
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(p).to.deep.equal(pos);
                  expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
                  expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
                  expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                  expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
                  done();
                })
                .catch((err: Error) => {
                  done(err);
                });
              expect(pos.inPosition()).to.equal(State.Active);
            })
            .catch((err: Error) => {
              done(err);
            });
        });
        it('should return Active if the exit market order trade has executed but not finalized', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            size: '1.0',
            side: 'sell',
          })
            .then((p: ShortPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);

              trader.placeOrder = placeOrderResolve({
                price: Big(1030),
                size: Big(1.0),
                side: 'buy',
                id: '1235',
                time: new Date(),
                productId: productId,
                status: 'pending',
                extra: 'none'
              });
              pos.exit({
                time: new Date(),
                type: 'placeOrder',
                productId: productId,
                orderType: 'market',
                size: '1.0',
                side: 'buy',
              })
                .then((p: ShortPosition) => {
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(p).to.deep.equal(pos);
                  emitMessage.call(trader, 'Trader.trade-executed', {
                    type: 'tradeExecuted',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'buy',
                    price: '1030',
                    orderType: 'market',
                    tradeSize: '1.0',
                    remainingSize: '0.0'
                  } as TradeExecutedMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
                  expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
                  expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                  expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
                  done();
                })
                .catch((err: Error) => {
                  done(err);
                });
              expect(pos.inPosition()).to.equal(State.Active);
            })
            .catch((err: Error) => {
              done(err);
            });
        });
        it('should return Active if the exit market order trade has finalized', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            size: '1.0',
            side: 'sell',
          })
            .then((p: ShortPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);

              trader.placeOrder = placeOrderResolve({
                price: Big(1030),
                size: Big(1.0),
                side: 'buy',
                id: '1235',
                time: new Date(),
                productId: productId,
                status: 'pending',
                extra: 'none'
              });
              pos.exit({
                time: new Date(),
                type: 'placeOrder',
                productId: productId,
                orderType: 'market',
                size: '1.0',
                side: 'buy',
              })
                .then((p: ShortPosition) => {
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(p).to.deep.equal(pos);
                  emitMessage.call(trader, 'Trader.trade-executed', {
                    type: 'tradeExecuted',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'buy',
                    price: '1030',
                    orderType: 'market',
                    tradeSize: '1.0',
                    remainingSize: '0.0'
                  } as TradeExecutedMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  emitMessage.call(trader, 'Trader.trade-finalized', {
                    type: 'tradeFinalized',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'sell',
                    price: '1030',
                    remainingSize: '0.0',
                    reason: 'filled'
                  } as TradeFinalizedMessage)
                  expect(p.inPosition()).to.equal(State.Ready);
                  expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
                  expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
                  expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                  expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
                  done();
                })
                .catch((err: Error) => {
                  done(err);
                });
              expect(pos.inPosition()).to.equal(State.Active);
            })
            .catch((err: Error) => {
              done(err);
            });
        })
      })
      describe('Exit limit orders', () => {
        it('should return Active if there is a pending exit limit order request to the Exchange', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            size: '1.0',
            side: 'sell',
          })
            .then((p: ShortPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);

              trader.placeOrder = placeOrderResolve({
                price: Big(1030),
                size: Big(1.0),
                side: 'buy',
                id: '1235',
                time: new Date(),
                productId: productId,
                status: 'pending',
                extra: 'none'
              });

              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              pos.exit({
                time: new Date(),
                type: 'placeOrder',
                productId: productId,
                orderType: 'limit',
                price: '1000',
                size: '1.0',
                side: 'buy',
              })
                .then((p: ShortPosition) => {
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(p).to.deep.equal(pos);
                  expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
                  expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
                  expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                  expect(trader.listenerCount('Trader.order-placed')).to.equal(1);
                  done();
                })
                .catch((err: Error) => {
                  done(err);
                });
              expect(pos.inPosition()).to.equal(State.Active);
            })
            .catch((err: Error) => {
              done(err);
            });
        });
        it('should return Active if the limit order has been placed on the order book', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            size: '1.0',
            side: 'sell',
          })
            .then((p: ShortPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);

              trader.placeOrder = placeOrderResolve({
                price: Big(1030),
                size: Big(1.0),
                side: 'buy',
                id: '1235',
                time: new Date(),
                productId: productId,
                status: 'pending',
                extra: 'none'
              });
              pos.exit({
                time: new Date(),
                type: 'placeOrder',
                productId: productId,
                orderType: 'limit',
                price: '1000',
                size: '1.0',
                side: 'buy',
              })
                .then((p: ShortPosition) => {
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(p).to.deep.equal(pos);
                  emitMessage.call(trader, 'Trader.order-placed', {
                    type: 'myOrderPlaced',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'buy',
                    size: '1.0',
                    price: '1000',
                    orderType: 'limit',
                    tradeSize: '1.0',
                    remainingSize: '0.0',
                    sequence: 1
                  } as MyOrderPlacedMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
                  expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
                  expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                  expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
                  done();
                })
                .catch((err: Error) => {
                  done(err);
                });
              expect(pos.inPosition()).to.equal(State.Active);
            })
            .catch((err: Error) => {
              done(err);
            });
        });
        it('should return Active if the entry limit order trade has executed', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            size: '1.0',
            side: 'sell',
          })
            .then((p: ShortPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);

              trader.placeOrder = placeOrderResolve({
                price: Big(1030),
                size: Big(1.0),
                side: 'buy',
                id: '1235',
                time: new Date(),
                productId: productId,
                status: 'pending',
                extra: 'none'
              });
              pos.exit({
                time: new Date(),
                type: 'placeOrder',
                productId: productId,
                orderType: 'limit',
                price: '1030',
                size: '1.0',
                side: 'buy',
              })
                .then((p: ShortPosition) => {
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(p).to.deep.equal(pos);
                  emitMessage.call(trader, 'Trader.order-placed', {
                    type: 'myOrderPlaced',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'buy',
                    size: '1.0',
                    price: '1030',
                    orderType: 'limit',
                    tradeSize: '1.0',
                    remainingSize: '0.0',
                    sequence: 1
                  } as MyOrderPlacedMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  emitMessage.call(trader, 'Trader.trade-executed', {
                    type: 'tradeExecuted',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'buy',
                    price: '1030',
                    orderType: 'limit',
                    tradeSize: '1.0',
                    remainingSize: '0.0'
                  } as TradeExecutedMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
                  expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
                  expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                  expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
                  done();
                })
                .catch((err: Error) => {
                  done(err);
                });
              expect(pos.inPosition()).to.equal(State.Active);
            })
            .catch((err: Error) => {
              done(err);
            });
        });
        it('should return Ready if the entry limit order trade has finalized', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            size: '1.0',
            side: 'sell',
          })
            .then((p: ShortPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);

              trader.placeOrder = placeOrderResolve({
                price: Big(1030),
                size: Big(1.0),
                side: 'buy',
                id: '1235',
                time: new Date(),
                productId: productId,
                status: 'pending',
                extra: 'none'
              });
              pos.exit({
                time: new Date(),
                type: 'placeOrder',
                productId: productId,
                orderType: 'limit',
                price: '1030',
                size: '1.0',
                side: 'buy',
              })
                .then((p: ShortPosition) => {
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(p).to.deep.equal(pos);
                  emitMessage.call(trader, 'Trader.order-placed', {
                    type: 'myOrderPlaced',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'buy',
                    size: '1.0',
                    price: '1030',
                    orderType: 'limit',
                    tradeSize: '1.0',
                    remainingSize: '0.0',
                    sequence: 1
                  } as MyOrderPlacedMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  emitMessage.call(trader, 'Trader.trade-executed', {
                    type: 'tradeExecuted',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'buy',
                    price: '1030',
                    orderType: 'limit',
                    tradeSize: '1.0',
                    remainingSize: '0.0'
                  } as TradeExecutedMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  emitMessage.call(trader, 'Trader.trade-finalized', {
                    type: 'tradeFinalized',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'buy',
                    price: '1030',
                    remainingSize: '0.0',
                    reason: 'filled'
                  } as TradeFinalizedMessage)
                  expect(p.inPosition()).to.equal(State.Ready);
                  expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
                  expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
                  expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                  expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
                  done();
                })
                .catch((err: Error) => {
                  done(err);
                });
              expect(pos.inPosition()).to.equal(State.Active);
            })
            .catch((err: Error) => {
              done(err);
            });
        });
      });
      describe('Exit stop market orders', () => {
        it('should return Active if there is a pending entry market stop order request to the Exchange', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            size: '1.0',
            side: 'sell',
          })
            .then((p: ShortPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);

              trader.placeOrder = placeOrderResolve({
                price: Big(1030),
                size: Big(1.0),
                side: 'buy',
                id: '1235',
                time: new Date(),
                productId: productId,
                status: 'pending',
                extra: 'none'
              });
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              pos.exit({
                time: new Date(),
                type: 'placeOrder',
                productId: productId,
                orderType: 'market',
                size: '1.0',
                side: 'buy',
                extra: {
                  stop: 'entry',
                  stopPrice: '1030'
                }
              })
                .then((p: ShortPosition) => {
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(p).to.deep.equal(pos);
                  expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
                  expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
                  expect(trader.listenerCount('Trader.stop-active')).to.equal(1);
                  expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
                  done();
                })
                .catch((err: Error) => {
                  done(err);
                });
              expect(pos.inPosition()).to.equal(State.Active);
            })
            .catch((err: Error) => {
              done(err);
            });
        });
        it('should return Active if there is an active exit stop market order', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            size: '1.0',
            side: 'sell',
          })
            .then((p: ShortPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);

              trader.placeOrder = placeOrderResolve({
                price: Big(980),
                size: Big(1.0),
                side: 'buy',
                id: '1235',
                time: new Date(),
                productId: productId,
                status: 'pending',
                extra: 'none'
              });
              pos.exit({
                time: new Date(),
                type: 'placeOrder',
                productId: productId,
                orderType: 'market',
                size: '1.0',
                side: 'buy',
                extra: {
                  stop: 'entry',
                  stopPrice: '990'
                }
              })
                .then((p: ShortPosition) => {
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(p).to.deep.equal(pos);
                  emitMessage.call(trader, 'Trader.stop-active', {
                    type: 'stopActive',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    size: '1.0',
                    side: 'buy',
                    funds: '1.0',
                    price: null,
                    orderType: 'market',
                    stopType: 'entry',
                    private: true,
                    stopPrice: '990',
                    takerFeeRate: '0.25',
                    sequence: 1
                  } as StopActiveMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
                  expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
                  expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                  expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
                  done();
                })
                .catch((err: Error) => {
                  done(err);
                });
              expect(pos.inPosition()).to.equal(State.Active);
            })
            .catch((err: Error) => {
              done(err);
            });
        });
        it('should return Active if the entry stop market order has been triggered and the trade has executed', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            size: '1.0',
            side: 'sell',
          })
            .then((p: ShortPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);

              trader.placeOrder = placeOrderResolve({
                price: Big(980),
                size: Big(1.0),
                side: 'buy',
                id: '1235',
                time: new Date(),
                productId: productId,
                status: 'pending',
                extra: 'none'
              });
              pos.exit({
                time: new Date(),
                type: 'placeOrder',
                productId: productId,
                orderType: 'market',
                size: '1.0',
                side: 'buy',
                extra: {
                  stop: 'entry',
                  stopPrice: '990'
                }
              })
                .then((p: ShortPosition) => {
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(p).to.deep.equal(pos);
                  emitMessage.call(trader, 'Trader.stop-active', {
                    type: 'stopActive',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    size: '1.0',
                    side: 'buy',
                    funds: '1.0',
                    price: null,
                    orderType: 'market',
                    stopType: 'entry',
                    private: true,
                    stopPrice: '990',
                    takerFeeRate: '0.25',
                    sequence: 1
                  } as StopActiveMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  emitMessage.call(trader, 'Trader.trade-executed', {
                    type: 'tradeExecuted',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'buy',
                    price: '980',
                    orderType: 'market',
                    tradeSize: '1.0',
                    remainingSize: '0.0'
                  } as TradeExecutedMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
                  expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
                  expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                  expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
                  done();
                })
                .catch((err: Error) => {
                  done(err);
                });
              expect(pos.inPosition()).to.equal(State.Active);
            })
            .catch((err: Error) => {
              done(err);
            });
        });
        it('should return Active if the entry stop market order has been triggered and the trade has executed', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            size: '1.0',
            side: 'sell',
          })
            .then((p: ShortPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);

              trader.placeOrder = placeOrderResolve({
                price: Big(980),
                size: Big(1.0),
                side: 'buy',
                id: '1235',
                time: new Date(),
                productId: productId,
                status: 'pending',
                extra: 'none'
              });
              pos.exit({
                time: new Date(),
                type: 'placeOrder',
                productId: productId,
                orderType: 'market',
                size: '1.0',
                side: 'buy',
                extra: {
                  stop: 'entry',
                  stopPrice: '990'
                }
              })
                .then((p: ShortPosition) => {
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(p).to.deep.equal(pos);
                  emitMessage.call(trader, 'Trader.stop-active', {
                    type: 'stopActive',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    size: '1.0',
                    side: 'buy',
                    funds: '1.0',
                    price: null,
                    orderType: 'market',
                    stopType: 'entry',
                    private: true,
                    stopPrice: '990',
                    takerFeeRate: '0.25',
                    sequence: 1
                  } as StopActiveMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  emitMessage.call(trader, 'Trader.trade-executed', {
                    type: 'tradeExecuted',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'buy',
                    price: '980',
                    orderType: 'market',
                    tradeSize: '1.0',
                    remainingSize: '0.0'
                  } as TradeExecutedMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  emitMessage.call(trader, 'Trader.trade-finalized', {
                    type: 'tradeFinalized',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'buy',
                    price: '980',
                    remainingSize: '0.0',
                    reason: 'filled'
                  } as TradeFinalizedMessage)
                  expect(p.inPosition()).to.equal(State.Ready);
                  expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
                  expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
                  expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                  expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
                  done();
                })
                .catch((err: Error) => {
                  done(err);
                });
              expect(pos.inPosition()).to.equal(State.Active);
            })
            .catch((err: Error) => {
              done(err);
            });
        });
      });
      describe('Exit stop limit orders', () => {
        it('should return Active if there is a pending exit limit stop order request to the Exchange', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            size: '1.0',
            side: 'sell',
          })
            .then((p: ShortPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);

              trader.placeOrder = placeOrderResolve({
                price: Big(1030),
                size: Big(1.0),
                side: 'buy',
                id: '1235',
                time: new Date(),
                productId: productId,
                status: 'pending',
                extra: 'none'
              });
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              pos.exit({
                time: new Date(),
                type: 'placeOrder',
                productId: productId,
                orderType: 'limit',
                price: '1000',
                size: '1.0',
                side: 'buy',
                extra: {
                  stop: 'entry',
                  stopPrice: '990'
                }
              })
                .then((p: ShortPosition) => {
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(p).to.deep.equal(pos);
                  expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
                  expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
                  expect(trader.listenerCount('Trader.stop-active')).to.equal(1);
                  expect(trader.listenerCount('Trader.order-placed')).to.equal(1);
                  done();
                })
                .catch((err: Error) => {
                  done(err);
                });
              expect(pos.inPosition()).to.equal(State.Active);
            })
            .catch((err: Error) => {
              done(err);
            });
        });
        it('should return Active if there is an active stop limit order', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            size: '1.0',
            side: 'sell',
          })
            .then((p: ShortPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);

              trader.placeOrder = placeOrderResolve({
                price: Big(1030),
                size: Big(1.0),
                side: 'buy',
                id: '1235',
                time: new Date(),
                productId: productId,
                status: 'pending',
                extra: 'none'
              });
              pos.exit({
                time: new Date(),
                type: 'placeOrder',
                productId: productId,
                orderType: 'limit',
                price: '1000',
                size: '1.0',
                side: 'buy',
                extra: {
                  stop: 'entry',
                  stopPrice: '990'
                }
              })
                .then((p: ShortPosition) => {
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(p).to.deep.equal(pos);
                  emitMessage.call(trader, 'Trader.stop-active', {
                    type: 'stopActive',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    size: '1.0',
                    side: 'buy',
                    funds: '1.0',
                    price: null,
                    orderType: 'limit',
                    stopType: 'entry',
                    private: true,
                    stopPrice: '990',
                    takerFeeRate: '0.25',
                    sequence: 1
                  } as StopActiveMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
                  expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
                  expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                  expect(trader.listenerCount('Trader.order-placed')).to.equal(1);
                  done();
                })
                .catch((err: Error) => {
                  done(err);
                });
              expect(pos.inPosition()).to.equal(State.Active);
            })
            .catch((err: Error) => {
              done(err);
            });
        });
        it('should return Active if the exit stop limit order has been triggered and is now on the order book', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            size: '1.0',
            side: 'sell',
          })
            .then((p: ShortPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);

              trader.placeOrder = placeOrderResolve({
                price: Big(1030),
                size: Big(1.0),
                side: 'buy',
                id: '1235',
                time: new Date(),
                productId: productId,
                status: 'pending',
                extra: 'none'
              });
              pos.exit({
                time: new Date(),
                type: 'placeOrder',
                productId: productId,
                orderType: 'limit',
                price: '1000',
                size: '1.0',
                side: 'buy',
                extra: {
                  stop: 'entry',
                  stopPrice: '990'
                }
              })
                .then((p: ShortPosition) => {
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(p).to.deep.equal(pos);
                  emitMessage.call(trader, 'Trader.stop-active', {
                    type: 'stopActive',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    funds: '100',
                    side: 'buy',
                    size: '1.0',
                    price: null,
                    orderType: 'limit',
                    stopType: 'entry',
                    private: true,
                    stopPrice: '990',
                    takerFeeRate: '0.25',
                    sequence: 1
                  } as StopActiveMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  emitMessage.call(trader, 'Trader.order-placed', {
                    type: 'myOrderPlaced',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'buy',
                    size: '1.0',
                    price: '990',
                    orderType: 'entry',
                    tradeSize: '1.0',
                    remainingSize: '0.0',
                    sequence: 1
                  } as MyOrderPlacedMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
                  expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
                  expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                  expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
                  done();
                })
                .catch((err: Error) => {
                  done(err);
                });
              expect(pos.inPosition()).to.equal(State.Active);
            })
            .catch((err: Error) => {
              done(err);
            });
        });
        it('should return Active if the entry stop limit order trade has executed', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            size: '1.0',
            side: 'sell',
          })
            .then((p: ShortPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);

              trader.placeOrder = placeOrderResolve({
                price: Big(1030),
                size: Big(1.0),
                side: 'buy',
                id: '1235',
                time: new Date(),
                productId: productId,
                status: 'pending',
                extra: 'none'
              });
              pos.exit({
                time: new Date(),
                type: 'placeOrder',
                productId: productId,
                orderType: 'limit',
                price: '1000',
                size: '1.0',
                side: 'buy',
                extra: {
                  stop: 'entry',
                  stopPrice: '990'
                }
              })
                .then((p: ShortPosition) => {
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(p).to.deep.equal(pos);
                  emitMessage.call(trader, 'Trader.stop-active', {
                    type: 'stopActive',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    funds: '100',
                    side: 'buy',
                    size: '1.0',
                    price: null,
                    orderType: 'limit',
                    stopType: 'entry',
                    private: true,
                    stopPrice: '990',
                    takerFeeRate: '0.25',
                    sequence: 1
                  } as StopActiveMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  emitMessage.call(trader, 'Trader.order-placed', {
                    type: 'myOrderPlaced',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'buy',
                    size: '1.0',
                    price: '990',
                    orderType: 'entry',
                    tradeSize: '1.0',
                    remainingSize: '0.0',
                    sequence: 1
                  } as MyOrderPlacedMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  emitMessage.call(trader, 'Trader.trade-executed', {
                    type: 'tradeExecuted',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'buy',
                    price: '990',
                    orderType: 'limit',
                    tradeSize: '1.0',
                    remainingSize: '0.0'
                  } as TradeExecutedMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
                  expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
                  expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                  expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
                  done();
                })
                .catch((err: Error) => {
                  done(err);
                });
              expect(pos.inPosition()).to.equal(State.Active);
            })
            .catch((err: Error) => {
              done(err);
            });
        });
        it('should return Ready if the entry stop limit order trade has finalized', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            size: '1.0',
            side: 'sell',
          })
            .then((p: ShortPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);

              trader.placeOrder = placeOrderResolve({
                price: Big(1030),
                size: Big(1.0),
                side: 'buy',
                id: '1235',
                time: new Date(),
                productId: productId,
                status: 'pending',
                extra: 'none'
              });
              pos.exit({
                time: new Date(),
                type: 'placeOrder',
                productId: productId,
                orderType: 'limit',
                price: '1000',
                size: '1.0',
                side: 'buy',
                extra: {
                  stop: 'entry',
                  stopPrice: '990'
                }
              })
                .then((p: ShortPosition) => {
                  expect(p.inPosition()).to.equal(State.Active);
                  expect(p).to.deep.equal(pos);
                  emitMessage.call(trader, 'Trader.stop-active', {
                    type: 'stopActive',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    funds: '100',
                    side: 'buy',
                    size: '1.0',
                    price: null,
                    orderType: 'limit',
                    stopType: 'entry',
                    private: true,
                    stopPrice: '990',
                    takerFeeRate: '0.25',
                    sequence: 1
                  } as StopActiveMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  emitMessage.call(trader, 'Trader.order-placed', {
                    type: 'myOrderPlaced',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'buy',
                    size: '1.0',
                    price: '990',
                    orderType: 'limit',
                    tradeSize: '1.0',
                    remainingSize: '0.0',
                    sequence: 1
                  } as MyOrderPlacedMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  emitMessage.call(trader, 'Trader.trade-executed', {
                    type: 'tradeExecuted',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'buy',
                    price: '990',
                    orderType: 'limit',
                    tradeSize: '1.0',
                    remainingSize: '0.0'
                  } as TradeExecutedMessage)
                  expect(p.inPosition()).to.equal(State.Active);
                  emitMessage.call(trader, 'Trader.trade-finalized', {
                    type: 'tradeFinalized',
                    time: new Date(),
                    productId: productId,
                    orderId: '1235',
                    side: 'buy',
                    price: '990',
                    remainingSize: '0.0',
                    reason: 'filled'
                  } as TradeFinalizedMessage)
                  expect(p.inPosition()).to.equal(State.Ready);
                  expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
                  expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
                  expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                  expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
                  done();
                })
                .catch((err: Error) => {
                  done(err);
                });
              expect(pos.inPosition()).to.equal(State.Active);
            })
            .catch((err: Error) => {
              done(err);
            });
        });
      });
      describe('Failed Order Placement', () => {
        it('should return Ready if the previous enter order failed to place', (done) => {
          trader.placeOrder = placeOrderReject(new PlaceOrderFailError('error'));
          let pos = new ShortPosition(trader, config.exchangeAPI, {
            maxRetriesOnOrderFail: 3,
            waitForFundsToClear: false,
            retryLimit: 10,
            retryInterval: 100
          });
          count = 0;
          expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
          expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
          expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
          expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            size: '1.0',
            side: 'sell',
          })
            .then((p: ShortPosition) => {
              done(assert(false));
            })
            .catch((err: Error) => {
              expect(count).to.equal(3);
              expect(pos.inPosition()).to.equal(State.Ready);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              done();
            })
          expect(pos.inPosition()).to.equal(State.Pending);
        });
        it('should return Active if the previous exit order failed to place', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            size: '1.0',
            side: 'sell',
          })
            .then((p: ShortPosition) => {
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);

              trader.placeOrder = placeOrderReject(new PlaceOrderFailError('failed'));
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              pos.exit({
                time: new Date(),
                type: 'placeOrder',
                productId: productId,
                orderType: 'market',
                size: '1.0',
                side: 'sell',
              })
                .then((p: ShortPosition) => {
                  done(assert(false));
                })
                .catch((err) => {
                  expect(pos.inPosition()).to.equal(State.Active);
                  expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
                  expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
                  expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
                  expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
                  done();
                });
            })
            .catch((err) => {
              done(err);
            });
        });
        it('should handle a limit order executing immediately', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'received',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
          expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
          expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
          expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'limit',
            price: '1000',
            size: '1.0',
            side: 'sell',
          })
            .then((p: ShortPosition) => {
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(1);
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1000',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
        });
        it('should handle a stop order executing immediately', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'received',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
          expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
          expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
          expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'limit',
            price: '1000',
            size: '1.0',
            side: 'sell',
            extra: {
              stop: 'loss',
              stopPrice: '1000'
            }
          })
            .then((p: ShortPosition) => {
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(1);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(1);
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.stop-active', {
                type: 'stopActive',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                funds: '100',
                side: 'sell',
                size: '1.0',
                price: null,
                orderType: 'limit',
                stopType: 'loss',
                private: true,
                stopPrice: '990',
                takerFeeRate: '0.25',
                sequence: 1
              } as StopActiveMessage)
              expect(p.inPosition()).to.equal(State.Pending);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(1);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1000',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
        });
        it('should handle auto-filling orders', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'pending',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          let order = {
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            side: 'sell',
          };
          reqOrder = null;
          expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
          expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
          expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
          expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
          pos.enter(order)
            .then((p: ShortPosition) => {
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              expect(p.inPosition()).to.equal(State.Pending);
              expect(order).not.haveOwnProperty('size');
              expect(order).not.haveOwnProperty('funds');
              expect(reqOrder).to.haveOwnProperty('size');
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
        });
        it('should handle also work when wait for funds is false', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'received',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, {
            maxRetriesOnOrderFail: 3,
            waitForFundsToClear: false,
            retryLimit: 10,
            retryInterval: 100
          });
          expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
          expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
          expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
          expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            size: '1.0',
            side: 'sell',
            extra: {
              stop: 'loss',
              stopPrice: '1001'
            }
          })
            .then((p: ShortPosition) => {
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(1);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.stop-active', {
                type: 'stopActive',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                funds: '1.0',
                side: 'sell',
                size: '1.0',
                price: '1001',
                orderType: 'market',
                stopType: 'loss',
                private: true,
                stopPrice: '1001',
                takerFeeRate: '0.25',
                sequence: 1
              } as StopActiveMessage)
              expect(p.inPosition()).to.equal(State.Pending);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              emitMessage.call(trader, 'Trader.trade-executed', {
                type: 'tradeExecuted',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1002',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0'
              } as TradeExecutedMessage);
              expect(p.inPosition()).to.equal(State.Active);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                remainingSize: '0.0',
                reason: 'filled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Active);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
          expect(pos.inPosition()).to.equal(State.Pending);
        });
        it('should remove all listers', () => {
          // we're testing this throughout all the other tests
          expect(true).to.equal(true);
        });
        it('should handle limit order being canceled', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'received',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'limit',
            price: '1000',
            size: '1.0',
            side: 'sell',
          })
            .then((p: ShortPosition) => {
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(1);
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.order-placed', {
                type: 'myOrderPlaced',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                size: '1.0',
                price: '1001',
                orderType: 'market',
                tradeSize: '1.0',
                remainingSize: '0.0',
                sequence: 1
              } as MyOrderPlacedMessage)
              expect(p.inPosition()).to.equal(State.Pending);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                remainingSize: '0.0',
                reason: 'canceled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Ready);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
        });
        it('should handle stop order being canceled', (done) => {
          trader.placeOrder = placeOrderResolve({
            price: Big(1000),
            size: Big(1.0),
            side: 'sell',
            id: '1234',
            time: new Date(),
            productId: productId,
            status: 'received',
            extra: 'none'
          });
          let pos = new ShortPosition(trader, config.exchangeAPI, { maxRetriesOnOrderFail: 1 });
          pos.enter({
            time: new Date(),
            type: 'placeOrder',
            productId: productId,
            orderType: 'market',
            size: '1.0',
            side: 'sell',
            extra: {
              stop: 'loss',
              stopPrice: '1000'
            }
          })
            .then((p: ShortPosition) => {
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(1);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              expect(p.inPosition()).to.equal(State.Pending);
              expect(p).to.deep.equal(pos);
              emitMessage.call(trader, 'Trader.stop-active', {
                type: 'stopActive',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                funds: '1.0',
                side: 'sell',
                size: '1.0',
                price: '1002',
                orderType: 'market',
                stopType: 'loss',
                private: true,
                stopPrice: '1001',
                takerFeeRate: '0.25',
                sequence: 1
              } as StopActiveMessage)
              expect(p.inPosition()).to.equal(State.Pending);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(1);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(1);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              emitMessage.call(trader, 'Trader.trade-finalized', {
                type: 'tradeFinalized',
                time: new Date(),
                productId: productId,
                orderId: '1234',
                side: 'sell',
                price: '1001',
                remainingSize: '0.0',
                reason: 'canceled'
              } as TradeFinalizedMessage)
              expect(p.inPosition()).to.equal(State.Ready);
              expect(trader.listenerCount('Trader.trade-executed')).to.equal(0);
              expect(trader.listenerCount('Trader.trade-finalized')).to.equal(0);
              expect(trader.listenerCount('Trader.stop-active')).to.equal(0);
              expect(trader.listenerCount('Trader.order-placed')).to.equal(0);
              done();
            })
            .catch((err: Error) => {
              done(err);
            })
        });
      });
    });

    describe('Enter()', () => {
      describe('Auto-fill order size or funds', () => {

      });
    });

    describe('Exit()', () => {
    });

  });
});