import { AbstractMessageTransform, MessageTransformConfig } from "gdax-trading-toolkit/build/src/lib";

//var talib = require('talib/build/Release/talib');
import * as talib from 'talib-binding'
import { TickerMessage, StreamMessage } from 'gdax-trading-toolkit/build/src/core';
import { CircularQueue } from "../utils";
import { Logger } from "gdax-trading-toolkit/build/src/utils/Logger";
import { MATypes } from "talib-binding";
export { MATypes } from "talib-binding";
import * as _ from 'underscore';
import { Candle } from "gdax-trading-toolkit/build/src/exchanges/PublicExchangeAPI";
import { ZERO } from "gdax-trading-toolkit/build/src/lib/types";
import PivotReversal from './pivotReversal';


export interface IndicatorConfig extends MessageTransformConfig {
  productId?: string;
}

/** 
 * implementation is up to the creater but it must conform
 * to the AbstractMessageTransform Interface to ensure
 * it can be inserted into the exchange feed. 
 */
export interface Indicator extends AbstractMessageTransform {

  transformMessage(msg: StreamMessage): StreamMessage;
}


export interface PriceBufferConfig extends IndicatorConfig {
  productId?: string;
  size?: number;
}

/** 
 * A base class for an indicator to implement a buffer storage for the 
 * historial indicator values. The `PriceBuffer` implements the 
 * `transformMessage` method required by the `AbstractMessageTransform`
 * class. Indicators that extend this abstract class must implement the 
 * `updateMessage` function in order to implement the `Indicator` interface 
 */
export abstract class PriceBuffer extends AbstractMessageTransform {
  protected _size: number;
  protected _priceData: CircularQueue;
  protected _productId: string;
  abstract updateMessage(msg: StreamMessage): StreamMessage;

  constructor(config: PriceBufferConfig) {
    super(config);
    this._size = config.size || 100;
    this._productId = config.productId || "";
    this._priceData = new CircularQueue(this._size);
  }

  transformMessage(msg: any): any {
    if (msg.type === "ticker") {
      if (!this._productId || (this._productId && this._productId === msg.productId)) {
        this._priceData.addToHead(msg.price.toNumber());

        msg = this.updateMessage(msg);
      }
    }

    return msg;
  }
}

export interface PriceHistoryConfig extends MessageTransformConfig {
  productId?: string;
}

export abstract class PriceHistory extends AbstractMessageTransform {
  
  private _history: number[];
  private _productId: string;

  constructor (config: PriceHistoryConfig) {
    super(config);

    this._productId = config.productId || '';
    this._history = [];
  }

  transformMessage(msg: any): any {

    if (msg.type === 'ticker') {

      if (this._productId && this._productId === msg.productId) {

        this._history.push(msg.price.toNumber());

        if (!msg.history) {
          msg.history = [];
        }

        msg.history = this._history;
      }
    }

    return msg;
  }
}


export interface EMAMessage extends TickerMessage {
  ema: { [index: string]: number };
}

export interface EMAConfig extends PriceBufferConfig {
  period?: number;
}

export class Ema extends PriceBuffer implements Indicator {
  private _period: number;
  private _lastEma: number;
  private _multiplier: number;

  constructor(config: EMAConfig) {
    config.size = config.size || config.period || 10;
    super(config);
    this._period = config.period || this._size;
    this._multiplier = (2 / (this._period + 1));
  }

  updateMessage(msg: TickerMessage | EMAMessage ): TickerMessage | EMAMessage  {

    let result: number;


    if (!_(msg).has('ema')) {
      let ema: { ema: { [index: string]: number } } = { ema: {} };
      _(msg).extend(ema);
    }

    if (this._lastEma) {
      result = ((msg.price.toNumber() - this._lastEma) * this._multiplier) + this._lastEma;
      this._lastEma = result;

      (msg as EMAMessage).ema[this._period] = result;

    } else if (this._priceData.size >= this._period) {
      [result] = talib.SMA(this._priceData.toArray(), this._period, this._period - 1, this._period - 1);
      this._lastEma = result;

      (msg as EMAMessage).ema[this._period] = result;

    } else {
      (msg as EMAMessage).ema[this._period] = null;
    }

    return (msg as EMAMessage);
  }
}

export interface SMAMessage extends TickerMessage {
  sma: { [index: string]: number };
}

export interface SMAConfig extends PriceBufferConfig {
  productId?: string;
  period?: number;
  logger?: Logger;
}

export class Sma extends PriceBuffer implements Indicator {
  private _period: number;

  constructor(config: SMAConfig) {
    config.size = config.size || config.period || 10;
    super(config);
    this._period = config.period || this._size;
  }

  updateMessage(msg: TickerMessage | SMAMessage): SMAMessage {

    if (this._priceData.size >= this._period) {
      let [result] = talib.SMA(
        this._priceData.toArray(),
        this._period,
        this._period - 1,
        this._period - 1
      );

      if (!(msg as SMAMessage).sma) {
        (msg as SMAMessage).sma = {};
      }

      (msg as SMAMessage).sma[this._period] = result;
    }

    return (msg as SMAMessage);
  }
}


export interface RsiConfig extends PriceBufferConfig {
  productId?: string;
  period?: number;
  logger?: Logger;
}

export class Rsi extends PriceBuffer {
  private _period: number;

  constructor(config: RsiConfig) {
    config.size = config.size || config.period || 14;
    super(config);
    this._period = config.period || this._size;
  }

  updateMessage(msg: any): any {

    if (!msg.rsi) {
      msg.rsi = {};
    }

    let [result] = talib.RSI(msg.history, this._period);
    msg.rsi = result;
  
    return msg;
  }
}


export interface StochRsiConfig extends PriceBufferConfig {
  productId?: string;
  period?: number;
  logger?: Logger;
  fastK?: number, 
  fastD?: number, 
  MAType?: MATypes
}

export class StochRsi extends PriceBuffer {
  private _period: number;
  private _fastK: number;
  private _fastD: number;
  private _MAType: MATypes;

  constructor(config: StochRsiConfig) {
    super(config);
    this._period = config.period || 14;
    this._fastK = config.fastK || 3;
    this._fastD = config.fastD || 3;
    this._MAType = config.MAType || MATypes.SMA;
  }

  updateMessage(msg: any): any {
    if (!msg.stochRsi) {
      msg.stochRsi = {};
    }

    msg.stochRsi = talib.STOCHRSI(msg.history, this._period, this._fastK, this._fastD, this._MAType);

    return msg;
  }
}




export interface CandleMessage extends TickerMessage {
  candles: { 
    [interval: string]: {
      history: Candle[];
      current: Candle;
    }
  }
}

export interface CandleConfig extends MessageTransformConfig {
    interval: string;
    productId?: string
}

export class CandleGenerator extends AbstractMessageTransform implements Indicator {
  
  protected _productId: string;
  protected _startTime: Date;
  protected _endTime: Date;
  protected _interval: string;
  protected _candle: Candle;
  protected _data: number[]; //store past [period] no of prices
  protected _history: Candle[]; //store past MA values



  constructor(config: CandleConfig) {
    super(config);
    this._interval = config.interval;
    this._productId = config.productId || '';
    let {start, end} = this.nextCandleTimes(new Date(), this._interval);
    this._startTime = start;
    this._endTime = end;
    this._candle = {
      timestamp: new Date(),
      open: ZERO,
      close: ZERO,
      high: ZERO,
      low: ZERO,
      volume: ZERO,
    };
    this._data = []; //store past [period] no of prices
    this._history = []; //store past MA values

  }

  transformMessage(msg: TickerMessage | CandleMessage): TickerMessage | CandleMessage {

    if (msg.type === 'ticker') {

      if (!this._productId || (this._productId && this._productId === msg.productId)) {

        // initialize on first tick
        if (this._candle.low.equals(ZERO) && this._candle.high.equals(ZERO)) {
          this._candle.low = msg.price;
          this._candle.high = msg.price;
        }

        // check if cross the interval boundary
        if (msg.time > this._endTime) {
          this._history.push(this._candle);

          let { start, end } = this.nextCandleTimes(msg.time, this._interval);
          this._startTime = start;
          this._endTime = end;
          let last = this._history[this._history.length - 1];
          this.log('debug', `New Candle opening at ${msg.price} | Start: ${start} End: ${end}`);
          this.log('debug', `Last Candle: o: ${last.open.toFixed(2)} h: ${last.high.toFixed(2)} l: ${last.low.toFixed(2)} c: ${last.close.toFixed(2)}`)

          this._candle = {
            timestamp: this._startTime,
            open: msg.price,
            close: msg.price,
            low: msg.price,
            high: msg.price,
            volume: ZERO
          }
        } else {
          this._candle.close = msg.price;
          this._candle.low = msg.price.lt(this._candle.low) ? msg.price : this._candle.low;
          this._candle.high = msg.price.gt(this._candle.high) ? msg.price : this._candle.high;
        }


        if (!_(msg).has('candles')) {
          (msg as CandleMessage).candles = {};
        }

        (msg as CandleMessage).candles[this._interval] = {
          history: this._history,
          current: this._candle
        }
      }
    }

    return msg;
  }

  nextCandleTimes(time: Date, interval: string): { start: Date; end: Date } {
    let toMilli: { [interval: string]: number } = {
      m: 1000 * 60,
      h: 1000 * 60 * 60,
      d: 1000 * 60 * 60 * 24,
      w: 1000 * 60 * 60 * 24 * 7,
      M: 1000 * 60 * 60 * 24 * 365 / 12
    };
    let [all, period, units] = /^([0-9]+)([mdhwM]+)$/.exec(interval);
    let milli = parseInt(period) * toMilli[units];
    let start = Math.round(time.getTime() / milli) * milli;

    return {
      start: new Date(start),
      end: new Date(start + milli)
    };
  }
}


interface IndicatorConstructor {
  new(config: IndicatorConfig ): Indicator
};

const indicators: { [index: string]: IndicatorConstructor } = {
  Ema: Ema,
  Sma: Sma,
  Rsi: Rsi,
  StochRsi: StochRsi,
  CandleGenerator: CandleGenerator,
  PivotReversal: PivotReversal
};


export function Factory(name: string, config: IndicatorConfig): Indicator {
  return new indicators[name](config);
};


