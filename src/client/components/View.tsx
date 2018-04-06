import React from 'react';
import moment from 'moment';


import { ActivityFeed } from './ActivityFeed';
import { AccountBalance } from './AccountBalance';
import { StartingBalance } from './StartingBalance';

const feed = [
  {
    name: 'Trader: Bot 2',
    description: 'Feed Item 1 description',
    timestamp: moment(Date.now()).fromNow()
  },
  {
    name: 'Trader: Bot 2',
    description: 'Feed Item 2 description',
    timestamp: moment(Date.now()).fromNow()
  },
  {
    name: 'Trader: Bot 3',
    description: 'Feed Item 3 description',
    timestamp: moment(Date.now()).fromNow()
  },
  {
    name: 'Trader: Bot 4',
    description: 'Feed Item 4 description',
    timestamp: moment(Date.now()).fromNow()
  },
  {
    name: 'Trader: Bot 5',
    description: 'Feed Item 5 description',
    timestamp: moment(Date.now()).fromNow()
  },
  {
    name: 'Trader: Bot 1',
    description: 'Feed Item 1 description',
    timestamp: moment(Date.now()).fromNow()
  },
  {
    name: 'Trader: Bot 2',
    description: 'Feed Item 2 description',
    timestamp: moment(Date.now()).fromNow()
  },
  {
    name: 'Trader: Bot 3',
    description: 'Feed Item 3 description',
    timestamp: moment(Date.now()).fromNow()
  },
  {
    name: 'Trader: Bot 4',
    description: 'Feed Item 4 description',
    timestamp: moment(Date.now()).fromNow()
  },
  {
    name: 'Trader: Bot 5',
    description: 'Feed Item 5 description',
    timestamp: moment(Date.now()).fromNow()
  },
  {
    name: 'Trader: Bot 1',
    description: 'Feed Item 1 description',
    timestamp: moment(Date.now()).fromNow()
  },
  {
    name: 'Trader: Bot 2',
    description: 'Feed Item 2 description',
    timestamp: moment(Date.now()).fromNow()
  },
  {
    name: 'Trader: Bot 3',
    description: 'Feed Item 3 description',
    timestamp: moment(Date.now()).fromNow()
  },
  {
    name: 'Trader: Bot 4',
    description: 'Feed Item 4 description',
    timestamp: moment(Date.now()).fromNow()
  },
  {
    name: 'Trader: Bot 5',
    description: 'Feed Item 5 description',
    timestamp: moment(Date.now()).fromNow()
  }
];

var balance = {
  USD: '456.87',
  BTC: '0.004532123'
};

var startingBalance = {
  USD: '10000.00',
  BTC: '2.0000000'
};

export const View = () => (
  <div className='mainview'>
    <div className='statsContainer'>
      <AccountBalance balance={balance}/>
      <StartingBalance balance={startingBalance}/>
    </div>
    <ActivityFeed feed={feed}/>
  </div>
);