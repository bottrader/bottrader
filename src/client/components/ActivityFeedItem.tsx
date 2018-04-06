import React from 'react';
export interface ActivityFeedItemProp { item: { name: string; description: string } }

export const ActivityFeedItem = (props: ActivityFeedItemProp) => (
  <div className='feedItem'>
    <h2 >{props.item.name}</h2>
    <h3>{props.item.description}</h3>
  </div>
);