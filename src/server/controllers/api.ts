export const api = require('express').Router();
import BotManager from '../Bot/services/BotManager';
import StrategyManager from '../Bot/services/StrategyManager';
import AuthManager from '../Bot/services/AccountManager';
import ExchangeManager from '../Bot/services/ExchangeManager';
import { ExchangeAuthConfig } from 'gdax-trading-toolkit/build/src/exchanges/AuthConfig';
import { Auth } from '../Bot/services/AccountManager';
import { Request, Response } from 'express-serve-static-core';
import { BotFactoryConfig } from '../Bot/factories/BotFactory';
import { Big } from 'gdax-trading-toolkit/build/src/lib/types';

const controllers = {
  account: {
    post: (req: Request, res: Response) => {
      let id = AuthManager.addAuth(
        req.body.exchangeId,
        req.body.name,
        req.body.auth
      );
      if (id) {
        res.status(201).send(id);
      } else {
        res.status(400).send('Unable to create Account');
      }
    }
  },

  accounts: {
    get: (req: Request, res: Response) => {
      let accounts = AuthManager.getAuths();
      res.status(200).send(accounts);
    }
  },

  bots: {
    get: (req: Request, res: Response) => {
      let bots = BotManager.getBots();
      res.status(200).send(bots);
    }
  },
  
  bot: {

    post: (req: Request, res: Response) => {
      let config: BotFactoryConfig = {
        name: req.body.name,
        exchangeId: req.body.exchangeId,
        accountId: req.body.accountId,
        productId: req.body.productId,
        strategyId: req.body.strategyId
      }
      BotManager.createBot(config)

        .then((id: string) => {
          res.status(201).end();
        })
        
        .catch((err: Error) => {
          res.status(500).send('Unable to create Bot');
        });
    },

    patch: (req: Request, res: Response) => {
      BotManager.updateBot(req.params.botId, req.body.options);
      res.status(200).end();
    },
    
    delete: (req: Request, res: Response) => {
      let id = BotManager.removeBot(req.params.botId);
      if (id) {
        res.status(200).send(id);
      } else {
        res.status(500).send('Unable to remove');
      }
    },

    get: (req: Request, res: Response) => {
      let bot = BotManager.getBot(req.params.botId);

      if (bot) {
        res.status(200).send(bot);
      } else {
        res.status(500).send('Unable to retrieve Bot');
      }
    }
  },

  trades: {
    get: (req: Request, res: Response) => {
      let botId = req.params.botId;

      let tradeLog = BotManager.getTradeHistory(botId);
      res.status(200).send(tradeLog);
    }
  },

  stats: {
    get: (req: Request, res: Response) => {
      let botId = req.params.botId;

      let tradeStats = BotManager.getTradeStats(botId);
      res.status(200).send(tradeStats);
    }
  },

  strategies: {
    get: (req: Request, res: Response) => {
      let strategies = StrategyManager.getStrategies();
      res.status(200).send(strategies);
    }
  },

  exchanges: {
    get: (req: Request, res: Response) => {
      let exchanges = ExchangeManager.getExchanges();
      res.status(200).send(exchanges);
    }
  },

  products: {
    get: (req: Request, res: Response) => {
      ExchangeManager.getProducts(req.params.exchangeId)

        .then((products: string[]) => {
          res.status(200).send(products);
        })

        .catch((err:Error) => {
          res.status(400).send('Invalid exchangeId: ' + err.message);
        });
    }
  },

  test: {
    post: (req: Request, res: Response) => {

      switch(req.params.command) {

        case 'high':
        case 'low':
          let price = req.body.price;
          let id = BotManager.getBots()[0].id;
          let bot = (BotManager as any)._bots[id];

          let pivot: any = {};
          pivot[req.params.command] = Big(price);

          bot.write({
            type: 'ticker',
            time: new Date(),
            productId: 'BTC-USD',
            price: Big(1000),
            bid: Big(1000),
            ask: Big(999.98),
            pivot: pivot
          });
          break;
      }

      res.sendStatus(201);
    }
  }
};

api.post('/account', controllers.account.post);
api.get('/accounts', controllers.accounts.get);
api.post('/bot', controllers.bot.post);
api.patch('/bot/:botId', controllers.bot.patch);
api.delete('/bot/:botId', controllers.bot.patch);
api.get('/bots', controllers.bots.get);
api.get('/trades/:botId', controllers.trades.get);
api.get('/stats/:botId', controllers.stats.get);
api.get('/strategies', controllers.strategies.get);
api.get('/products/:exchangeId', controllers.products.get);
api.get('/exchanges', controllers.exchanges.get);
api.post('/test/:command', controllers.test.post);

export default api;