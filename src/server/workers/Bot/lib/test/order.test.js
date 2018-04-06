var BuyOrder = require('../order.js').BuyOrder;
var SellOrder = require('../order.js').SellOrder;
var OrderType = require('../order.js').OrderType;

let price = 1000;

try {

  //STRATEGY
  console.log(`Strategy Setting Order Parameters....`);

  console.log(`Placing new Buy Order: current price: ${price}`);
  order = new BuyOrder();

  console.log(`Order Type is: ${OrderType[order.orderType]}`); // 'market'
  console.log(`Order is Buy Order: ${order.isBuyOrder}`); // true
  try {
    console.log(`${OrderType[order.orderType]} Order at: ${order.orderPrice}`); //throw error because price not set
  } catch(err) {
    console.error(err.message);
  }

  try {
    console.log(`Requesting RiskReward Ratio on ${OrderType[order.orderType]} Order`); //'market
    console.log(`RiskReward Ratio is: ${order.riskRewardRatio}`); //throw error because market order
  } catch (err) {
    console.error(err.message);
  }

  console.log(`Converting Order to Limit Order`);
  order.makeLimitOrder(price);
  console.log(`Order Type is: ${OrderType[order.orderType]}`); // 'limit
  console.log(`Order is Buy Order: ${order.isBuyOrder}`); // true
  console.log(`${OrderType[order.orderType]} Order at: ${order.orderPrice}`); // 'limit, '1000'

  try {
    console.log(`Requesting RiskReward Ratio on ${OrderType[order.orderType]} Order`); //'limit
    console.log(`RiskReward Ratio is: ${order.riskRewardRatio}`); //throw error because stoploss and target not set
  } catch (err) {
    console.error(err.message);
  }

  console.log(`Setting Stoploss`);
  order.stopLoss = price - 20;
  console.log(`StopLoss set at ${order.stopLoss}`); //'980

  console.log(`Setting Target`);
  order.target = price + 80;
  console.log(`Target set at ${order.target}`); //'1080

  console.log(`RiskReward Ratio is: ${order.riskRewardRatio}`); //4
  console.log(`Setting RiskRewardRatio to 3`);
  order.riskRewardRatio = 3;
  console.log(`Order Target set at ${order.target}`); //1060


  // BOT
  console.log(`Bot Setting Order Parameters....`)
  
  console.log(`Setting risk at 2% of Account Size`);
  order.accountSize = 40000;
  order.risk = 0.02;
  console.log(`Risk is: ${order.risk}`); // 0.02
  console.log(`Absolute Risk is: ${order.risk * order.accountSize}`); //800
  console.log(`Order Quantity is: ${order.quantity}`); //40
  console.log(`Reward is: ${order.reward}`); // 0.03
  console.log(`Aboslute Reward is: ${order.reward * order.accountSize}`); // 1200
  console.log(`RiskReward Ratio is: ${order.riskRewardRatio}`); //3

  // BOT with insufficient funds
  console.log(`Bot Setting Order Parameters....in sufficient funds`)

  order.stopLoss = 800;
  order.riskRewardRatio = 3;
  console.log(`StopLoss set at ${order.stopLoss}`); //'800 
  console.log(`Target set at ${order.target}`); //'1600

  console.log(`Setting Account size to $5,000`);
  order.accountSize = 5000;
  order.risk = 0.02;
  console.log(`Risk is: ${order.risk}`); // 0.02
  console.log(`Order Quantity is: ${order.quantity}`); //0.5

  
} catch(err) {
  console.error(err.message);
}
