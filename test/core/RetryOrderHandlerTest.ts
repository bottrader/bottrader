import { expect } from 'chai';
import { RetryOrderHandler } from '../../src/server/Bot/core/RetryOrderHandler';
import { PlaceOrderFailError } from '../../src/server/Bot/lib/errors';
import { AssertionError } from 'assert';
import { PlaceOrderMessage } from 'gdax-trading-toolkit/build/src/core';
import { LiveOrder } from 'gdax-trading-toolkit/build/src/lib';


describe('RetryOrderHandler Tests', () => {

  describe('init', () => {

    it('should initialize correctly', () => {
      let test = function () { new RetryOrderHandler({limit: 1, interval: 100}); }
      expect(test).to.not.throw(); 
    })

    it('should throw an error if limit is not a number', () => {
      let test = function () { new RetryOrderHandler({ limit: null, interval: 100 }); }
      expect(test).to.throw(AssertionError);
    });

    it('should throw an error if limit is equal to zero', () => {
      let test = function () { new RetryOrderHandler({ limit: 0, interval: 100 }); }
      expect(test).to.throw(AssertionError);
    });

    it('should throw an error if interval is not a number', () => {
      let test = function () { new RetryOrderHandler({ limit: 1, interval: null }); }
      expect(test).to.throw(AssertionError);
    });

    it('should throw an error if interval is equal to zero', () => {
      let test = function () { new RetryOrderHandler({ limit: 1, interval: 0 }); }
      expect(test).to.throw(AssertionError);
    });
  });

  describe('sendOrder', () => {

    it('should return a promise', (done) => {
      let msg = {};
      let handler = (msg: any) => { 
        return Promise.resolve(); 
      }

      let retry = new RetryOrderHandler({ limit: 100, interval: 1000 });
      let result = retry.sendOrder(msg, handler, 3);
      expect(result).to.be.a('promise');
      result.then(() => { done() });
      result.catch((err) => done(err));

    });

    it('promise should resolve to result of handler function (immediate)', (done) => {
      let msg = {};
      let handler = (msg: any) => {
        return Promise.resolve('passed');
      }

      let retry = new RetryOrderHandler({limit: 100, interval: 1000});
      retry.sendOrder(msg, handler, 3)
        .then((result) => {
          expect(result).to.be.a('string');
          expect(result).to.equal('passed');
          done()
        })
        .catch((err) => done(err));
    });

    it('promise should resolve to result of handler function (async)', (done) => {
      let msg = {};
      let handler = (msg: any) => {

        return new Promise((resolve, retry) => {
          setTimeout(() => {
            resolve('passed');
          }, 10);
        });
      }

      let retry = new RetryOrderHandler({limit: 100, interval: 1000});
      retry.sendOrder(msg, handler, 3)
        .then((result) => {
          expect(result).to.be.a('string');
          expect(result).to.equal('passed');
          done()
        })
        .catch((err) => done(err));
    });

    it('should throw Exceeded Max Retries error if handler resolve to null more than max retries', (done) => {
      let msg = {};
      let count = 0;
      let handler = (msg: any) => {
        count++;
        return Promise.resolve(null);
      }

      let retry = new RetryOrderHandler({limit: 100, interval: 1000});
      retry.sendOrder(msg, handler, 4)
        .then(() => {
          done(new Error('Promise Resolved without throwing Error'));   
        })
        .catch((err) => {
          expect(count).to.equal(4);
          expect(err).to.be.a('error');
          expect(err.name).to.equal('ExceededRetryCountError');
          done();
        });
    });

    it('should throw Exceeded Max Retries error if handler rejects more than max retries (immediate)', (done) => {
      let msg = {};
      let count = 0;
      let handler = (msg: any) => {
        count++;
        return Promise.reject(new PlaceOrderFailError('Handler Failed'));
      }

      let retry = new RetryOrderHandler({limit: 100, interval: 1000});
      retry.sendOrder(msg, handler, 4)
        .then(() => {
          done(new Error('Promise Resolved without throwing Error'));
        })
        .catch((err) => {
          expect(count).to.equal(4);
          expect(err).to.be.a('error');
          expect(err.name).to.equal('ExceededRetryCountError');
          done();
        });
    });

    it('should throw Exceeded Max Retries error if handler rejects more than max retries (async)', (done) => {
      let msg = {};
      let count = 0;
      let handler = (msg: any) => {
        count++;
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            reject(new PlaceOrderFailError('Handler Failed'));
          }, 10);
        });
      }

      let retry = new RetryOrderHandler({limit: 100, interval: 1000});
      let result = retry.sendOrder(msg, handler, 4)
        .then(() => {
          done(new Error('Promise Resolved without throwing Error'));
        })
        .catch((err) => {
          expect(count).to.equal(4);
          expect(err).to.be.a('error');
          expect(err.name).to.equal('ExceededRetryCountError');
          done();
        });
    });

    it('should not throw error if a single order request fails', (done) => {
      let msg = {};
      let count = 0;
      let handler = (msg: any) => {
        count++;

        if (count < 2) {
          return Promise.reject(new PlaceOrderFailError('Failed'));
        } else {
          return Promise.resolve('passed');
        }
      }

      let retry = new RetryOrderHandler({limit: 100, interval: 1000});
      retry.sendOrder(msg, handler, 3)
        .then((result) => {
          expect(count).to.equal(2);
          expect(result).to.equal('passed');
          done();
        })
        .catch((err) => {
          done(err);
       })
    });

    it('should not throw error if a multiple order requests fail', (done) => {
      let msg = {};
      let count = 0;
      let handler = (msg: any) => {
        count++;

        if (count < 4) {
          return Promise.reject(new PlaceOrderFailError('Failed'));
        } else {
          return Promise.resolve('passed');
        }
      }

      let retry = new RetryOrderHandler({limit: 100, interval: 1000});
      retry.sendOrder(msg, handler, 5)
        .then((result) => {
          expect(count).to.equal(4);
          expect(result).to.equal('passed');
          done();
        })
        .catch((err) => {
          done(err);
        })
    });
    
    it('should not throw error if a handler resolves on final attempt', (done) => {
      let msg = {};
      let count = 0;
      let handler = (msg: any) => {
        count++;

        if (count < 4) {
          return Promise.reject(new PlaceOrderFailError('Failed'));
        } else {
          return Promise.resolve('passed');
        }
      }

      let retry = new RetryOrderHandler({limit: 100, interval: 1000});
      retry.sendOrder(msg, handler, 4)
        .then((result) => {
          expect(count).to.equal(4);
          expect(result).to.equal('passed');
          done();
        })
        .catch((err) => {
          done(err);
        })
    });

    it('should throw any errors besides order requested failed', (done) => {
      let msg = {};
      let count = 0;
      let handler = (msg: any) => {
        count++;
        return Promise.reject(new Error('Generic Error'));
      }

      let retry = new RetryOrderHandler({limit: 100, interval: 1000});
      retry.sendOrder(msg, handler, 4)
        .then(() => {
          done(new Error('Promise Resolved without throwing Error'));
        })
        .catch((err) => {
          expect(count).to.equal(1);
          expect(err).to.be.a('error');
          expect(err.name).to.equal('Error');
          done();
        });
    });
  });

  describe('Delayed Retry', () => {
    it('should immediately send the first order', (done) => {
      
      let time = new Date();
      let msg = {
        time: time
      };
      let count = 0;
      let times: Date[] = [];
      times[0] = time;

      let handler = (msg: any) => {
        count++
        times.push(msg.time);
        return Promise.resolve('passed');
      }

      let retry = new RetryOrderHandler({ limit: 1, interval: 100 });
      retry.sendOrder(msg, handler, 4)
        .then((result) => {
          expect(result).to.equal('passed');
          expect(count).to.equal(1);
          expect(times.length).to.equal(2);
          expect(times[1].getTime() - times[0].getTime()).to.be.lessThan(2);
          done();
        })
        .catch((err) => {
          done(err);
        });
    });
    it('should wait the specified time before retrying the order request', (done) => {
      let time = new Date();
      let msg = {
        time: time
      };
      let count = 0;
      let times: Date[] = [];
      times[0] = time;

      let handler = (msg: any) => {
        count++
        times.push(msg.time);
        return Promise.resolve(null);
      }

      let retry = new RetryOrderHandler({ limit: 1, interval: 50 });
      retry.sendOrder(msg, handler, 4)
        .then(() => {
          done(new Error('Promise Resolved without throwing Error'));
        })
        .catch((err) => {
          expect(count).to.equal(4);
          expect(times.length).to.equal(5);
          expect(times[1].getTime() - times[0].getTime()).to.be.lessThan(2);
          expect(times[2].getTime() - times[1].getTime()).to.be.greaterThan(48);
          expect(times[3].getTime() - times[2].getTime()).to.be.greaterThan(48);
          expect(times[4].getTime() - times[3].getTime()).to.be.greaterThan(48);
          expect(err).to.be.a('error');
          expect(err.name).to.equal('ExceededRetryCountError');
          done();
        });
    });
  });
  describe('With Data', () => {

    it('should update the time that the message is sent', (done) => {
      let count = 0;
      let now: Date = new Date();
      let callTime: Date;

      let order: PlaceOrderMessage = {
        time: new Date(),
        type: 'placeOrder',
        productId: 'BTC-USD',
        side: 'sell',
        orderType: 'market',
        extra: {
          stop: 'loss',
          stopPrice: '1000'
        }
      };

      let handler = (msg: PlaceOrderMessage): Promise<PlaceOrderMessage> => {
        count++

        callTime = new Date();

        return new Promise((resolve) => {
          setTimeout(() => {
            if (count === 1) {
              resolve(null);
            } else {
              resolve(msg);
            }
          });
        });
      };

      let retry = new RetryOrderHandler({ limit: 1, interval: 100 });
      retry.sendOrder(order, handler, 3)
        .then((msg: PlaceOrderMessage) => {
          expect(count).to.equal(2);
          expect(msg.time.getTime() - callTime.getTime()).to.be.lte(2);
          expect(msg.time.getTime() - now.getTime()).to.be.greaterThan(98);
          done();
        })
        .catch((err) => {
          done(err);
        });
    });

    it('should not change any other fields in the message', (done) => {
      let count = 0;

      let order: PlaceOrderMessage = {
        time: new Date(),
        type: 'placeOrder',
        productId: 'BTC-USD',
        side: 'sell',
        orderType: 'market',
        extra: {
          stop: 'loss',
          stopPrice: '1000'
        }
      };

      let handler = (msg: PlaceOrderMessage): Promise<PlaceOrderMessage> => {

        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(msg);
          });
        });
      };

      let retry = new RetryOrderHandler({ limit: 1, interval: 50 });
      retry.sendOrder(order, handler, 3)
        .then((msg: PlaceOrderMessage) => {
          expect(msg.type).to.equal('placeOrder');
          expect(msg.productId).to.equal('BTC-USD');
          expect(msg.side).to.equal('sell');
          expect(msg.orderType).to.equal('market');
          expect(msg.extra.stop).to.equal('loss');
          expect(msg.extra.stopPrice).to.equal('1000');
          done();
        })
        .catch((err) => {
          done(err);
        });
    });

    it('should not make a copy of the message', (done) => {
      let count = 0;

      let order: PlaceOrderMessage = {
        time: new Date(),
        type: 'placeOrder',
        productId: 'BTC-USD',
        side: 'sell',
        orderType: 'market',
        extra: {
          stop: 'loss',
          stopPrice: '1000'
        }
      };

      let handler = (msg: PlaceOrderMessage): Promise<PlaceOrderMessage> => {

        count++;

        return new Promise((resolve) => {
          setTimeout(() => {
            if (count === 1) {
              resolve(null);
            } else {
              resolve(msg);
            }
          });
        });
      };

      let retry = new RetryOrderHandler({ limit: 1, interval: 50 });
      retry.sendOrder(order, handler, 3)
        .then((msg: PlaceOrderMessage) => {
          expect(order).to.deep.equal(msg);
          done();
        })
        .catch((err) => {
          done(err);
        });
    });
  });
});
