import React from 'react';
export interface AccountBalanceProps { balance: { [index:string]: string } };

export const AccountBalance = (props: AccountBalanceProps) => {
  let quoteLabel: string = Object.keys(props.balance)[0];
  let contractLabel: string = Object.keys(props.balance)[1];
  return (
    <div className='accountBalance'>
      <div className='row'>
        <span className='label'>{quoteLabel}</span>
        <span className='value'>{props.balance[quoteLabel]}</span>
      </div>
      <div className='row'>
        <span className='label'>{contractLabel}</span>
        <span className='value'>{props.balance[contractLabel]}</span>
      </div>
    </div>
  );
};


// const AccountBalance = (props) => (
//   <div className='accountBalance'>
//     <div className='row'>
//       <span className='label'>{Object.keys(props.balance)[0]}</span>
//       <span className='value'>{props.balance[0]}</span>
//     </div>
//     <div className='row'>
//       <span className='label'>{Object.keys(props.balance)[1]}</span>
//       <span className='value'>{props.balance[1]}</span>
//     </div>
//   </div>
// )