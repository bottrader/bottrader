import { Bot, TradeLog, TradeStats, STATE_IDLE, STATE_TRADING } from '../core/Bot';
import { v1 as uuid } from 'uuid';
import * as GTT from 'gdax-trading-toolkit';
import { Factories } from '..';
import { GDAXFeed } from 'gdax-trading-toolkit/build/src/exchanges';
import AccountManager from './AccountManager';
import StrategyManager from './StrategyManager';
import ExchangeManager from './ExchangeManager';
import { GDAXAuthConfig } from 'gdax-trading-toolkit/build/src/exchanges/gdax/GDAXInterfaces';
import BotFactory from '../factories/BotFactory';
import { BotFactoryConfig } from '../factories/BotFactory';

export type BotHash = { [id: string]: Bot };

export type BotEntry = { 
  id: string, 
  name: string,
  state: string, 
};

export interface BotOptions {
  start?: boolean;
  stop?: boolean;
  reset?: boolean;
}

export class BotManager {
  private _bots: BotHash;

  constructor() {
    this._bots = {};
    this._loadBots()
  }

  private _loadBots(): void {

    //ToDo: load bots from db
    // Promise.resolve([])
    //   .then((bots: Bot[]) => (
    //     this._bots = new Map(bots.map((entry: BotEntry): [string, BotEntry] => [id, entry]))))
    //   .catch(err => console.error('Unable to load Bots'));
  }

  createBot(config: BotFactoryConfig): Promise<string> {
    //get Account Auth for Exchange

    // return new Promise((resolve, reject) => {
      
    return BotFactory(config)

      .then((bot) => {
        this._bots[bot.id] = bot;
        return bot.id;
      })

      .catch(err => {
          console.error('Unable to create Bot');
          throw new Error('Unable to create Bot');
      });
  }

  getBot(id: string): BotEntry {
    let bot = this._bots[id];

    if (bot) {
      return {
        id: id,
        name: bot.name,
        state: bot.state
      }
    }

    return null;
  }

  updateBot(id: string, options: BotOptions) {
    let bot = this._bots[id];

    if (!bot) {
      throw new Error('Unable to retrieve Bot');
    }

    if (options.start && bot.state === STATE_IDLE) {
      bot.start();
    }

    if (options.stop && bot.state === STATE_TRADING) {
      bot.stop();
    }

    if (options.reset) {
      bot.reset();
    }
  }

  removeBot(id: string): BotEntry[] {
    let bot = this._bots[id];

    if (!bot) {
      throw new Error('Unable to retrieve Bot');
    }

    if (bot.state === STATE_IDLE) {
      delete this._bots[id];
    }

    return this.getBots();
  }

  getBots(): BotEntry[] {
    return Object.keys(this._bots).map((id) => ({
      id: id,
      name: this._bots[id].name,
      state: this._bots[id].state
    }));

  }

  getTradeHistory(id: string): TradeLog[] {
    const bot = this._bots[id];

    if (bot) {
      return bot.getTradeHistory();
    }

    return [];
  }

  getTradeStats(id: string): TradeStats {
    const bot = this._bots[id];

    if (bot) {
      return bot.getTradeStats();
    }

    return {};
  }
}

export default new BotManager();

