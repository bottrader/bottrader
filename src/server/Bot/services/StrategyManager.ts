import { TradingStrategy, TradingStrategyConfig, IndicatorDescription } from '../strategies/TradingStrategy';
import { v1 as uuid } from 'uuid';

export type StrategyHash = { [id: string]: TradingStrategyConfig };

export type StrategyEntry = {
  id: string, 
  details: { [index: string]: string },
  liveOrderbook: boolean,
  indicators: IndicatorDescription[]
};

export class StrategyManager {
  private _strategies: StrategyHash;

  constructor() {
    this._strategies = {};
  }

  getStrategy(strategyId: string): TradingStrategyConfig | undefined {
    return this._strategies[strategyId];
  }

  getStrategies(): StrategyEntry[] {
    return Object.keys(this._strategies).map((id) => {
      return { 
        id: id, 
        details: this._strategies[id].details, 
        liveOrderbook: this._strategies[id].liveOrderbook ? true : false, 
        indicators: this._strategies[id].indicators 
      };
    });
  }

  addStrategy(strategyConfig: TradingStrategyConfig): void {
    const strategyId = uuid();
    this._strategies[strategyId] = strategyConfig;
  }
}

export default new StrategyManager();