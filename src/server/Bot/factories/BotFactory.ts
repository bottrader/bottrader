import { Logger } from 'gdax-trading-toolkit/build/src/utils/Logger';
import { Bot } from '../core/Bot';
import { ExchangeFeed, GDAXFeed } from 'gdax-trading-toolkit/build/src/exchanges';
import { TradingStrategy, TradingStrategyConfig } from '../strategies/TradingStrategy';
import * as GTT from 'gdax-trading-toolkit';
import { LiveOrderbook, StreamMessage, isStreamMessage, MyOrderPlacedMessage } from 'gdax-trading-toolkit/build/src/core';
import { Indicator } from '../lib/talib-gtt';
import { EventEmitter } from 'events';
import { Writable, Transform } from 'stream';
import { TraderConfig, Trader } from 'gdax-trading-toolkit/build/src/core/Trader';
import { AuthenticatedExchangeAPI } from 'gdax-trading-toolkit/build/src/exchanges/AuthenticatedExchangeAPI';
import StrategyManager from '../services/StrategyManager';
import ExchangeManager from '../services/ExchangeManager';
import { BotConfig } from '../core';
import { ConsoleLoggerFactory } from 'gdax-trading-toolkit/build/src/utils';
import { LiveOrder } from 'gdax-trading-toolkit/build/src/lib';
import * as winston from 'winston';
import 'winston-daily-rotate-file';


export interface BotFactoryConfig {
  name: string;
  exchangeId: string;
  accountId: string;
  productId: string;
  strategyId: string;
}

export default function BotFactory(config: BotFactoryConfig): Promise<Bot> {
  
  const logger = ConsoleLoggerFactory({
    transports: [
      new winston.transports.Console({
        colorize: 'all',
        json: false,
        timestamp: true,
        prettyPrint: true
      })
    ]
  });

  //get strategy

  const strategyConfig = StrategyManager.getStrategy(config.strategyId);

  let strategy = new TradingStrategy(strategyConfig, logger);
  strategy.productId = config.productId;

  (logger as any).add(winston.transports.File, {
    name: 'error-file',
    filename: `${config.name}-${strategy.name}-error.log`,
    dirname: './errorlogs',
    json: false,
    timestamp: true,
    level: 'error',
    prettyPrint: true
  });

  (logger as any).add(winston.transports.File, {
    name: 'debug-file',
    filename: `${config.name}-${strategy.name}.log`,
    dirname: './logs',
    json: false,
    timestamp: true,
    level: 'debug',
    prettyPrint: true
  });

  let botConfig: BotConfig = { name: config.name, strategy: strategy, logger: logger };

  strategy.productId = config.productId;

  let api = ExchangeManager.getApi(config.exchangeId, config.accountId, logger);

  strategy.api = api;

  // create trade logger for executing trades
  const traderConfig: TraderConfig = { logger: logger, sizePrecision: 8, pricePrecision: 2, productId: config.productId, exchangeAPI: api, fitOrders: false };

  strategy.trader = new Trader(traderConfig);

  if (strategy.liveOrderbook) {
    if (config.productId) {
      strategy.book = new GTT.Core.LiveOrderbook({
        product: config.productId,
        logger: logger
      });
    }
  }

  let bot = new Bot(botConfig);

  return ExchangeManager.getFeed(
    config.exchangeId,
    config.accountId,
    logger,
    [config.productId]
  )

    .then((feed: ExchangeFeed) => {
      
      if (strategy.liveOrderbook) {
        feed.pipe(strategy.book);
      }

      feed.pipe(strategy.trader);

      if (strategy.indicators.length > 0) {
        
        strategy.indicators.reduce((acc, curr) => {
          return curr ? acc.pipe(curr) : acc;
        }).pipe(bot);

        feed.pipe(strategy.indicators[0]);
      } else {
        feed.pipe(bot);
      }

      // consume the stream
      bot.pipe(new Writable({
        objectMode: true,
        highWaterMark: 1024,
        write: function(chunk: any, encoding: string, next: (err?: Error, chunk?: any) => void) {
          next();
        }
      }));


        
      return bot;
    })

    .catch(err => {
      logger.log('error', 'Error getting Feed', err.message);
      throw new Error('Unable to get Feed');
    });

}
