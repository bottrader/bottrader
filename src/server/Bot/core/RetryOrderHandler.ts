import { ExceededRetryCountError, PlaceOrderFailError } from '../lib/errors';
import * as assert from 'assert';
import RateLimiter from 'gdax-trading-toolkit/build/src/core/RateLimiter';
import { Readable } from 'stream';
import { Logger } from 'gdax-trading-toolkit/build/src/utils/Logger';

export interface RetryOrderHandlerConfig {
  limit: number;
  interval: number;
  logger?: Logger;
}

export class RetryOrderHandler extends Readable{
  private _limiter: RateLimiter;
  private _limit: number;
  private _interval: number;
  private _logger: Logger;

  constructor(config: RetryOrderHandlerConfig) {
    super({objectMode: true})

    assert(config.limit > 0);
    assert(config.interval > 0);

    this._limit = config.limit;
    this._interval = config.interval;
    this._logger = config.logger;
  }

  log(level: string, message: string, meta?: any) {
    if (!this._logger) {
      return;
    }

    this._logger.log(level, message, meta);
  }

  sendOrder(msg: any, handler: (msg: any) => Promise<any>, retries: number): Promise<any> {
    let retryCount = retries;
    return new Promise((resolve, reject) => {
 
      let _send = () => {

        this.log('debug', `RetryHander->Attempt no. ${retries - retryCount + 1} to send order`);

        handler(msg)
          .then((result: any) => {
            if (result === null) {
              this.log('debug', `RetryHander->Place Order Request Failed (null)`);

              // error = new ExceededRetryCountError('Exceeded maximum number of retries');
              retryCount--;
              if (retryCount === 0) {
                this.push(null);
                this.log('error', `RetryHander->Place Order Exceeded Retry Count (null)`);
                reject(new ExceededRetryCountError('Exceeded maximum number of retries'));
              } else {
                setImmediate(() => {
                  this.push(msg);
                });  
              }
              return;
            }
            this.push(null);
            resolve(result);
          })
          .catch((err: Error) => {

            if (err.name === 'PlaceOrderFailError') {
              this.log('debug', `RetryHander->Place Order Request Failed (err)`);

              // error = new ExceededRetryCountError('Exceeded maximum number of retries');
              retryCount--;
              if (retryCount === 0) {
                this.push(null);
                this.log('error', `RetryHander->Place Order Exceeded Retry Count (err)`);
                reject(new ExceededRetryCountError('Exceeded maximum number of retries'));
              } else {
                setImmediate(() => {
                  this.push(msg);
                });       
              }
            } else {
              this.log('error', `RetryHander->Place Order failed with ${err.name}`, err.message);
              reject(err);
              // retries = 0;
            }
          });
      }

      let limiter = new RateLimiter(this._limit, this._interval);
      limiter.on('data', (msg: any) => {
        _send.call(this);
      });
      this.pipe(limiter);

      this.push(msg);
    });
  }

  _read() {}
}