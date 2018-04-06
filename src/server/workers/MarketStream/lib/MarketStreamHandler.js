var AutobahnConnection = require('autobahn').Connection; 

class MarketStreamHandler extends AutobahnConnection {
  constructor(url, pair) {
    super({url: url, realm: 'realm1'});
    this.channel = pair;
    this.start = new Promise((resolve, reject) => {
      this.resolve = resolve, 
      this.reject = reject
    });
  }

  onopen(session) {
    if (!this.streamHandler) {
      this.reject(new ReferenceError('streamHandler has not been set yet'));
      return;
    }
    session.subscribe(this.channel, this.streamHandler);
    this.resolve();
  }

  open(streamHandler) {
    this.streamHandler = streamHandler;
    super.open();
    return this.start;
  }
}

module.exports = MarketStreamHandler;