import React from 'react';

import ActivityFeedItem from './ActivityFeedItem.jsx';

const ActivityFeed = (props) => (
  <div className='activityContainer'>  
    {props.feed.map((item, index) => (
      <ActivityFeedItem key={index} item={item} />
    ))}
  </div>
);

export default ActivityFeed;