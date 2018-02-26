import React from 'react';

const ActivityFeedItem = (props) => (
  <div className='feedItem'>
    <h2 >{props.item.name}</h2>
    <h3>{props.item.description}</h3>
  </div>
);

export default ActivityFeedItem;