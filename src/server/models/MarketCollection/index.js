//collection of Market Connectors

    // Market Connector

      //creates new Market Account, 1 : 1 : MarketConnector : MarketAccount

        //creates new Liquidity Pool

        //on request creates new Trade Account, assigns LIquidity pool

          //each Trade Accounts can have multiple Bot Clients

          //each Bot can have dedicated liquidity pool or shared liquidity Pool

      ///WORKER

        //creates new MarketStream, 1: 1 : Market Account : Market Stream

          //creates new MarketStreamHandler, 1 : Many MarketStream : MarketStreamHandler

          //1:1 marketStreamHandler to bot 



// MarketConnector

// -> Request Bot for MarketX

// if MarketCollection.contains connector for MarketX
    // get MarketConnector
    // get MarketAccount from MarketConnector
    // get list of liquidity Pools
    // request new TradeAccount
      // if no liquidity pool selected
        // create new liquidity Pool and shared liquidity from existing pools
      // else if existing liquidity pool selected
        //asign new TradeAccount to existing pool
        //set account ID
        //return handle to account



marketConnector = new MarketConnector('poloniex')

marketConnector.connect() //connect to tradeAccount, create new MarketStream

  //marketStream has connected to exchange, providing ws on localhost:3001
  //marketAccount connected
  .then(() => {

    //after marketStream and marketAccount connected
    //fetch available liquidity pools
    let availablePools = marketConnector.getPools();
    //request new tradeAccount
    let tradeAccount = marketConnector.requestTradeAccount(availablePools[1])
    let streamUrl = marketConnector.streamUrl;

    //
    let bot = cp.fork('./bot.js', [__stratdir]);
    let botId = botCollection.add(bot);
    bot.send({
      botId: botId,
      streamUrl: streamUrl,
      accountSecret: tradeAccount.secret,
      accountId: tradeAccount.id
    })
  })