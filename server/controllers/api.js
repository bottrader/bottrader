const api = require('express').Router();

const controllers = {

  trade: {

    post: (req, res) => {
      res.send(201).end('/trade', req.body);
    },

    get: (req, res) => {
      res.send(200).end('/trade');
    }
  },

  account: {

    get: (req, res) => {
      res.send(200).end('/account');
    }
  },

  accounts: {
    get: (req, res) => {
      res.send(200).end('/accounts');
    }
  },

  bot: {

    get: (req, res) => {
      res.send(200).end('/bot');
    },

    post: (req, res) => {
      res.send(201).end('/bot', req.body);
    }
  },

  bots: {
    get: (req, res) => {
      res.send(200).end('/bots');
    }
  },

  report: {

    post: (req, res) => {
      res.send(201).end('/report', req.body);
    }
  }
};


api.post('/trade', controllers.trade.post);
api.get('/trade', controllers.trade.get);
api.get('/account', controllers.account.get);
api.get('/accounts', controllers.accounts.get);
api.get('/bot', controllers.bot.get);
api.post('/bot', controllers.bot.post);
api.get('/bots', controllers.bots.get);
api.post('/report', controllers.report.post);

module.exports = api;
