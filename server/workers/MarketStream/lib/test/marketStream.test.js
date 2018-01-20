const autobahn = require('autobahn');
const wsuri = "ws://127.0.0.1:9000/";
const cp = require('child_process');

class ParentClass {
  constructor() {
    this.stream = cp.fork('../MarketStream.js');
    this.stream.on('message', this.receiveMessage.bind(this));
    process.on('message', this.receiveMessage2.bind(this));
    console.log('child PID: ', this.stream.pid);
    console.log('parent PID: ', process.pid);
    console.log('Connected to Child: ', this.stream.connected);

    this.connection = new autobahn.Connection({ url: wsuri, real: 'realm2' });
    this.connection.onopen = (session) => {
      session.subscribe('marketfeed', this.feedHandler.bind(this));
    }
    this.connection.open();
  }

  sendToChild(param, msg) {
    console.log('Child Connected: ', this.stream.connected);
    console.log(`About to Send Message: ${JSON.stringify(param)}, ${msg}`);
    let message = {}
    message[param] = msg;
    console.log(`Packaged Message: ${JSON.stringify(message)}`);    
    this.stream.send(message);
  }

  receiveMessage(message) {
    console.log('Received Message from Child');
    console.log(message);
  }

  receiveMessage2(message) {
    console.log(message);
  }

  feedHandler(data) {
    console.log(data);
  }
}

let parent = new ParentClass();

parent.sendToChild('details', {exchange: 'poloniex', pair: 'BTC_ETH'});


