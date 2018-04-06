import { TickerMessage } from 'gdax-trading-toolkit/build/src/core';
import { MessageTransformConfig, AbstractMessageTransform } from 'gdax-trading-toolkit/build/src/lib';
import { Indicator, CandleMessage } from './talib-gtt';
import { Candle } from 'gdax-trading-toolkit/build/src/exchanges/PublicExchangeAPI';
import * as _ from 'underscore';
import { BigJS } from 'gdax-trading-toolkit/build/src/lib/types';


export interface PivotMessage extends TickerMessage {
  pivot: {
    low?: BigJS;
    high?: BigJS;
  };
}

export interface PivotConfig extends MessageTransformConfig {
  leftBars?: number;
  rightBars?: number;
  productId?: string;
}

export class PivotReversal extends AbstractMessageTransform implements Indicator {

  protected _productId: string;
  protected _leftBars: number; 
  protected _rightBars: number;

  constructor(config: PivotConfig) {
    super(config);

    this._leftBars = config.leftBars || 4;
    this._rightBars = config.rightBars || 2;
    this._productId = config.productId || '';
  }

  transformMessage(msg: any): any {
    if (msg.type === 'ticker') {
      if (
        !this._productId ||
        (this._productId && this._productId === msg.productId)
      ) {

        (msg as PivotMessage).pivot = {};

        if (_(msg as CandleMessage).has('candles')) {
          
          // for each set of Candles
          for (let i in (msg as CandleMessage).candles) {
            let bars = (msg as CandleMessage).candles[i].history.slice(-(this._leftBars + this._rightBars));

            if (bars.length === (this._leftBars + this._rightBars)) {
              let pivotLow: BigJS | boolean = this.pivotLow(bars, this._leftBars);

              if (pivotLow) {
                (msg as PivotMessage).pivot.low = pivotLow as BigJS;
              }

              let pivotHigh: BigJS | boolean = this.pivotHigh(bars, this._leftBars);

              if (pivotHigh) {
                (msg as PivotMessage).pivot.high = pivotHigh as BigJS;
              }
            }
          }
        }
      }
    }

    return msg;
  }

  pivotLow(bars: Candle[], leftBars: number): BigJS | boolean {
    let pivotLow = bars[leftBars - 1].low;

    for (let i = 0; i < bars.length; i++) {
      if (i !== (leftBars - 1)) {
        if (bars[i].low.lte(pivotLow)) {
          return false;
        }
      }
    }

    return pivotLow;
  }

  pivotHigh(bars: Candle[], leftBars: number): BigJS | boolean {
    let pivotHigh = bars[leftBars - 1].high;

    for (let i = 0; i < bars.length; i++) {
      if (i !== (leftBars - 1)) {
        if (bars[i].high.gte(pivotHigh)) {
          return false;
        }
      }
    }

    return pivotHigh;
  }
}

export default PivotReversal;
