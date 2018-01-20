describe('StateMachine', function() {

  var bot = new bot();

  describe('Allowed Transitions', function() {
    it('should start in init state', function() {
      expect(bot.sm.state).to.equal('init');
    });

    it('should transition from init to waiting', function() {
      bot.sm.start();
      expect(bot.sm.state).to.equal('waiting');
    });

    it('should transition from waiting to watching', function () {
      bot.sm.engage();
      expect(bot.sm.state).to.equal('watching');
    });

    it('should transition from watching to trading', function () {
      let oldPrepareBuyOrder = bot.prepareBuyOrder;
      bot.prepareBuyOrder = function (lifecycle) {
        return true;
      }
        bot.sm.buy();
        expect(bot.sm.state).to.equal('trading');
      });
      bot.prepareBuyOrder = oldPrepareBuyOrder;
    });
    it('should transition from trading to housekeeping', function () {
      bot.sm.exit();
      expect(bot.sm.state).to.equal('housekeeping');
    });
    it('should transition from housekeeping to watching', function () {
      bot.sm.ready();
      expect(bot.sm.state).to.equal('watching');
    });
    
    it('should transition from trading to shutdown', function () {
      let oldPrepareBuyOrder = bot.prepareBuyOrder;
      bot.prepareBuyOrder = function (lifecycle) {
        return true;
      }
      bot.sm.buy();
      expect(bot.sm.state).to.equal('trading');
      bot.prepareBuyOrder = oldPrepareBuyOrder;
      bot.sm.redButton();
      expect(bot.sm.state).to.equal('shutdown');
    });
    
    it('should transition from shutdown to init', function () {
      bot.sm.reset();
      expect(bot.sm.state).to.equal('init');
    });
  });

  describe('Disallowed Transitions', function() {
    describe('Init State', function() {
      it('should not transition from init to trading');
      it('should not transition from init to watching');
      it('should not transition from init to housekeeping');
      it('should not transition from init to shutdown');
    });
    describe('Waiting State', function() {
      it('should not transition from init to init');
      it('should not transition from init to trading');
      it('should not transition from init to housekeeping');
      it('should not transition from init to shutdown');
    });
    describe('Watching State', function() {
      it('should not transition from init to init');
      it('should not transition from init to housekeeping');
      it('should not transition from init to shutdown');
    });
    describe('Trading State', function() {
      it('should not transition from init to waiting');
      it('should not transition from init to watching');
      it('should not transition from init to init');
    });
    describe('Housekeeping State', function() {
      it('should not transition from init to init');
      it('should not transition from init to watching');
      it('should not transition from init to trading');
      it('should not transition from init to shutdown');
    });
  });


})