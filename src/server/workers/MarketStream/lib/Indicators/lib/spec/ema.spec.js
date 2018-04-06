var chai = require('chai');
var expect = chai.expect;
var EMA = require('../Indicators/ema');

var testData = [22.2734000
,22.1940000
,22.0847000
,22.1741000
,22.1840000
,22.1344000
,22.2337000
,22.4323000
,22.2436000
,22.2933000
,22.1542000
,22.3926000
,22.3816000
,22.6109000
,23.3558000
,24.0519000
,23.7530000
,23.8324000
,23.9516000
,23.6338000
,23.8225000
,23.8722000
,23.6537000
,23.1870000
,23.0976000
,23.3260000
,22.6805000
,23.0976000
,22.4025000
,22.1725000];


describe('EMA', function() {
  var testEMA;
  before( function() {
    testEMA = new EMA(10);
    testEMA_15 = new EMA(15);
    testEMA_100 = new EMA(100);
  });
  it('should have the correct period set', function() {
    expect(testEMA.period).to.equal(10);
    expect(testEMA_15.period).to.equal(15);
    expect(testEMA_100.period).to.equal(100);
  });
  it('should set the multiplier', function() {
    expect(testEMA.multiplier).to.equal(0.18181818181818182);
  });
  it('should start out with isValid flag as false', function() {
    expect(testEMA.isValid).to.equal(false);
  });
  it('should not calculate an EMA if called less than period', function() {
    testEMA.update(testData[0]);
    expect(testEMA.last).to.equal(0);
    expect(testEMA.isValid).to.equal(false);
    testEMA.update(testData[1]);
    expect(testEMA.last).to.equal(0);
    expect(testEMA.isValid).to.equal(false);
    testEMA.update(testData[2]);
    expect(testEMA.last).to.equal(0);
    expect(testEMA.isValid).to.equal(false);
    testEMA.update(testData[3]);
    expect(testEMA.last).to.equal(0);
    expect(testEMA.isValid).to.equal(false);
    testEMA.update(testData[4]);
    expect(testEMA.last).to.equal(0);
    expect(testEMA.isValid).to.equal(false);
    testEMA.update(testData[5]);
    expect(testEMA.last).to.equal(0);
    expect(testEMA.isValid).to.equal(false);
    testEMA.update(testData[6]);
    expect(testEMA.last).to.equal(0);
    expect(testEMA.isValid).to.equal(false);
    testEMA.update(testData[7]);
    expect(testEMA.last).to.equal(0);
    expect(testEMA.isValid).to.equal(false);
    testEMA.update(testData[8]);
    expect(testEMA.last).to.equal(0);
    expect(testEMA.isValid).to.equal(false);
  });
  it('should return the SMA on the nth call where n is the period', function() {
    testEMA.update(testData[9]);
    expect(testEMA.last).to.equal(22.22475);
  });
  it('should set isValid flag to true', function() {
    expect(testEMA.isValid).to.equal(true);
  });
  it('should return the EMA on the nth+1 call', function() {
    testEMA.update(testData[10]);
    expect(testEMA.last).to.equal(22.21192272727273);
  });
  it('should return the EMA on the nth+1 call', function() {
    testEMA.update(testData[11]);
    expect(testEMA.last).to.equal(22.24477314049587);
  });
  it('should return the EMA on the nth+1 call', function() {
    testEMA.update(testData[12]);
    expect(testEMA.last).to.equal(22.269650751314803);
  });
});
