const path = require('path');
//var webpack = require('webpack');
const express = require('express');
//var config = require('../../webpack.config');

const app = express();
//var compiler = webpack(config);


import * as controller from './controllers';
import StrategyManager from './Bot/services/StrategyManager';
import strategyConfig from './Bot/strategies/exampleStrategy';
import candleGenConfig from './Bot/strategies/candleGeneratorStrategy';
import pivotReversalStrategyLong from './Bot/strategies/pivotReversalStrategyLong';
import pivotReversalStrategyShort from './Bot/strategies/pivotReversalStrategyShort';
import { TradingStrategy } from './Bot/strategies/TradingStrategy';
import { Response, Request } from 'express-serve-static-core';
import ExchangeManager from './Bot/services/ExchangeManager';
import AccountManager from './Bot/services/AccountManager';
import BotManager from './Bot/services/BotManager';
import * as dotenv from 'dotenv';

dotenv.config();

const morgan = require('morgan');
const port = process.env.PORT4 || 3000;

console.log('__dirname', __dirname);

// app.use(require('webpack-dev-middleware')(compiler, {
//   publicPath: config.output.publicPath
// }));

// app.use(require('webpack-hot-middleware')(compiler));


app.use(morgan('tiny')); //middleware logging
app.use(express.json()); //middleware data parsing

app.use('/api', controller.api);
app.use(express.static(path.join(__dirname, '../../../dist')));

app.get('*', function(req: Request, res: Response) {
  res.sendFile(path.join(__dirname, '../../../dist/index.html'));
});

StrategyManager.addStrategy(pivotReversalStrategyLong);
StrategyManager.addStrategy(pivotReversalStrategyShort);
StrategyManager.addStrategy(candleGenConfig);
StrategyManager.addStrategy(strategyConfig);

let exchangeId = ExchangeManager.getExchanges()[0].id;
let strategyId = StrategyManager.getStrategies()[1].id;
let accountId = AccountManager.addAuth(exchangeId, 'gdax 4', {
	key: process.env.GDAX_KEY4,
  secret: process.env.GDAX_SECRET4,
  passphrase: process.env.GDAX_PASSPHRASE4
});
BotManager.createBot({
  exchangeId: exchangeId,
  strategyId: strategyId,
  accountId: accountId,
  productId: 'BTC-USD',
  name: 'Short Bot'
});


app.listen(port, function (err: Error) {
  if (err) {
    return console.error(err);
  }
  
  console.log(`Bot Server listening on port ${port}!`);
});


