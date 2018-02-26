import React from 'react';
import moment from 'moment';

import ActivityFeed from './ActivityFeed.jsx';

const feed = [
  {
    name: 'Trader: Cherry',
    description: 'Feed Item 1 description',
    timestamp: moment(Date.now()).fromNow()
  },
  {
    name: 'Trader: Evan',
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

const View = () => (
  <div className='mainview'>
    <div className='statsContainer'>
    </div>
    <ActivityFeed feed={feed}/>
  </div>
);

export default View;
