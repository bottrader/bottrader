import { v1 as uuid } from 'uuid';
import { ExchangeFeed, BitfinexExchangeAPI, GDAXExchangeAPI } from 'gdax-trading-toolkit/build/src/exchanges';
import * as Exchanges from 'gdax-trading-toolkit/build/src/exchanges';
import * as Factories from 'gdax-trading-toolkit/build/src/factories';
import { Logger } from 'gdax-trading-toolkit/build/src/utils/Logger';
import { ExchangeAuthConfig } from 'gdax-trading-toolkit/build/src/exchanges/AuthConfig';
import { ConsoleLoggerFactory } from 'gdax-trading-toolkit/build/src/utils';
import { AuthenticatedExchangeAPI } from 'gdax-trading-toolkit/build/src/exchanges/AuthenticatedExchangeAPI';
import { PublicExchangeAPI, Product } from 'gdax-trading-toolkit/build/src/exchanges/PublicExchangeAPI';
import AccountManager from './AccountManager';
import { GDAXConfig } from 'gdax-trading-toolkit/build/src/exchanges/gdax/GDAXInterfaces';
import * as GTT from 'gdax-trading-toolkit';
import * as _ from 'underscore';

interface ExchangeHash { 
  [id: string]: Exchange 
};

export interface ExchangeEntry {
  id: string;
  name: string;
};

interface AuthenticatedExchange { 
  [accountId: string]: { 
    feed?: ExchangeFeed, 
    api?: AuthenticatedExchangeAPI 
  } 
};

interface Exchange { 
  name: string; 
  publicAPI: (logger: Logger) => any; 
  FeedFactory: (logger: Logger, productIds: string[], auth?: any) => any; 
  APIFactory: any; 
  authAPI: AuthenticatedExchange; 
  products?: string[] 
};

const exchanges: Exchange[] = [
  {
    name: 'GDAX',
    publicAPI: Factories.GDAX.DefaultAPI,
    FeedFactory: Factories.GDAX.FeedFactory,
    APIFactory: Exchanges.GDAXExchangeAPI,
    authAPI: {}
  }
];

export class ExchangeManager {
  private _exchanges: ExchangeHash

  constructor() {
    this._exchanges = {};

    exchanges.forEach(exchange => {
      this._exchanges[uuid()] = exchange;
    });
  }

  getFeed(exchangeId: string, accountId: string, logger: Logger, productIds: string[]): Promise<ExchangeFeed> {
    
    let auth = AccountManager.getAuth(accountId);

    if (!auth) {
      return Promise.reject(new Error('Invalid Account Id'));
    }

    console.dir(auth);
    
    return GTT.Factories.GDAX.FeedFactory(logger, productIds, auth);

          
    
    
    
    // let exchange = this._exchanges.get(exchangeId);

    // if (!exchange) {
    //   return Promise.reject(new Error('Invalid Exchange Id'));
    // }

    // if (exchange.authAPI[accountId]) {
    //   let feed = exchange.authAPI[accountId].feed;

    //   if (feed) {
    //     return Promise.resolve(feed);
    //   }
    // }

    // let auth = AccountManager.getAuth(accountId);

    // if (!auth) {
    //   return Promise.reject(new Error('Invalid Account Id'));
    // }
  
    // if (!exchange.authAPI[accountId]) {
    //   exchange.authAPI[accountId] = {};
    // } 


    // return exchange.FeedFactory(logger, productIds, auth)

    //   .then((feed: ExchangeFeed) => {
    //     exchange.authAPI[accountId].feed = feed;

    //     if (!exchange.authAPI[accountId].feed) {
    //       return Promise.reject(new Error('Unable to obtain feed from exchange'));
    //     }

    //     this._exchanges.set(exchangeId, exchange);

    //     if (exchange.authAPI[accountId].feed) {
    //       return exchange.authAPI[accountId].feed;
    //     }
    //   })

    //   .catch(err => {
    //     console.error('Error obtaining Feed', err.message);
    //   });
  }

  getApi(exchangeId: string, accountId: string, logger: Logger): AuthenticatedExchangeAPI {
    let exchange: Exchange = this._exchanges[exchangeId];

    if (!exchange) {
      throw new Error('Invalid exchange Id');
    }

    if (_(exchange).has('authAPI')) {
      if (_(exchange.authAPI).has(accountId)) {
        let api = exchange.authAPI[accountId].api;

        if (api) {
          return api;
        }
      }
    }

    let auth = AccountManager.getAuth(accountId);

    if (!auth) {
      throw new Error ('Invalid account Id');
    }

    if (!_(exchange).has('authAPI')) {
      exchange.authAPI = {};
    }
    
    if (!_(exchange.authAPI).has(accountId)) {
      exchange.authAPI[accountId] = {};
    }
     
    exchange.authAPI[accountId].api = new exchange.APIFactory({auth: auth, logger: logger});
  
    if (!exchange.authAPI[accountId].api) {
      throw new Error ('Unable to create API interface for Exchange');
    }

    this._exchanges[exchangeId] = exchange;
    return exchange.authAPI[accountId].api;
  }

  getExchanges(): ExchangeEntry[] {
    return Object.keys(this._exchanges).map(
      (id) => ({
        id: id,
        name: this._exchanges[id].name
      })
    );
  }

  getExchange(exchangeId: string): string {
    let exchange = this._exchanges[exchangeId];

    if (!exchange) {
      throw new Error('Invalid Exchange Id');
    }

    return exchange.name;
  }

  getProducts(exchangeId: string): Promise<string[]> {
    let exchange = this._exchanges[exchangeId];

    if (!exchange) {
      throw new Error('Invalid Exchange Id');
    }
    let logger = ConsoleLoggerFactory();
    let products;
    
    return exchange.publicAPI(logger).loadProducts()

      .then((products: Product[]) => {
        let ids:string[] = products.map((p: Product) => p.id);
        return ids;
      })
      
      .catch((err: Error) => { 
        console.error(err);
        return err;
      });

  }
}

export default new ExchangeManager();
