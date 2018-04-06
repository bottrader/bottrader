import React from 'react';
import { ActivityFeedItem, ActivityFeedItemProp } from './ActivityFeedItem.jsx';

export interface ActivityFeedProps { feed: ActivityFeedItemProp[] }

export const ActivityFeed = (props) => (
  <div className='activityContainer'>  
    {props.feed.map((item, index) => (
      <ActivityFeedItem key={index} item={item} />
    ))}
  </div>
);
