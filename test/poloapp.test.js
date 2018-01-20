var chai = require('chai');
var expect = chai.expect;
var EMA = require('../Indicators/ema');
var SMA = require('../Indicators/sma');
var PSAR = require('../Indicators/psar');


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

var testData2 = [

{ open: 10.3,	high: 10.33,	low: 10.11,  close: 10.16 },
{ open: 9.95,	high: 9.98,	low: 9.76,	  close: 9.80 },
{ open: 9.75,	high: 9.83,	low: 9.64,   close: 9.76 },
{ open: 9.55,	high: 9.6,	low: 9.35,   close: 9.41 },
{ open: 9.55,	high: 9.85,	low: 9.51,   close: 9.85 },
{ open: 9.77,	high: 9.8,	low: 9.25,   close: 9.33 },
{ open: 9.09,	high: 9.19,	low: 9.0,   close: 9.06 },
{ open: 9.16,	high: 9.41,	low: 9.16,   close: 9.40 },
{ open: 9.40,	high: 9.47,	low: 9.08,   close: 9.22 },
{ open: 8.95,	high: 9.32,	low: 8.95,   close: 9.31 },
{ open: 9.64, high: 9.94,	low: 9.55,   close: 9.76 },
{ open: 9.83,	high: 10.23,	low: 9.83,   close: 10.00 },
{ open: 10.0,	high: 10.11,	low: 9.57,   close: 9.59 },
{ open: 9.46,	high: 10.5,	low: 9.46,   close: 10.40 },
{ open: 10.88,high: 11.25,	low: 10.8,	close: 11.23 },
{ open: 11.3,	high: 11.57,	low: 11.3,	close: 11.44 },
{ open: 11.49,	high: 11.55,	low: 11.2,	close: 11.44 },
{ open: 11.42,	high: 11.8,	low: 11.3,	close: 11.78 },
{ open: 11.78,	high: 11.9,	low: 11.7,	close: 11.88 },
{ open: 11.85,	high: 11.94,	low: 11.6,	close: 11.67 },
{ open: 11.5,	high: 11.59,	low: 11.3,	close: 11.33 },
{ open: 11.22,	high: 11.43,	low: 11.05,	close: 11.05 },
{ open: 10.95,	high: 11.23,	low: 10.87,	close: 11.09 },
{ open: 11.22,	high: 11.37,	low: 11.11,	close: 11.35 },
{ open: 11.20,	high: 11.34,	low: 11.12,	close: 11.27 },
{ open: 11.08,	high: 11.27,	low: 11.0,	close: 11.00 },
{ open: 10.86,	high: 10.94,	low: 10.8,  close: 10.76 },
{ open: 10.68,	high: 10.76,	low: 10.5,	close: 10.54 },
{ open: 10.62,	high: 10.69,	low: 10.6,	close: 10.68 },
{ open: 10.66,	high: 10.78,	low: 10.1,	close: 10.09 },
{ open: 9.95,	high: 10.02,	low: 9.8,   close: 9.89 },
{ open: 9.95,	high: 10.06,	low: 9.8,   close: 10.04 },
{ open: 9.75,	high: 9.8,	low: 9.5,   close: 9.63 },
{ open: 9.68,	high: 9.75,	low: 9.6,   close: 9.66 },
{ open: 9.42,	high: 9.5,  low: 9.3,   close: 9.36 },
{ open: 9.28,	high: 9.39,	low: 9.1,   close: 9.37 },
{ open: 9.4,	high: 9.54,	low: 9.1,   close: 9.10 },
{ open: 8.97,	high: 9.45,	low: 9.0,   close: 9.43 },
{ open: 9.37,	high: 9.65,	low: 9.3,	  close: 9.52 },
{ open: 9.8,	high: 10.0,	low: 9.8,   close: 9.81 },
{ open: 10.0,	high: 10.0,	low: 9.9,   close: 9.91 },
{ open: 9.6,	high: 9.8,	low: 9.6,   close: 9.76 },
{ open: 9.7,	high: 10.1,	low: 9.7,   close: 9.96 },
{ open: 10.0,	high: 10.0,	low: 9.3,   close: 9.26 },
{ open: 9.1,	high: 9.4,	low: 9.1,   close: 9.40 },
{ open: 9.3,	high: 9.5,	low: 9.2,   close: 9.22 },
{ open: 9.2,	high: 9.3,	low: 9.1,   close: 9.20 },
{ open: 9.1,	high: 9.4,	low: 8.8,   close: 9.37 },
{ open: 9.3,	high: 9.4,	low: 9.3,   close: 9.35 },
{ open: 9.3,	high: 10.1,	low: 9.3,   close: 10.08 }];

describe('Indicators', function() {
  describe('Oscillators', function() {

  });
  describe('Breadth Indicators', function() {

  });
  describe('Overlays', function() {
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

    describe('SMA', function() {
      var testSMA;
      before( function() {
        testSMA = new SMA(10);
        testSMA_15 = new SMA(15);
        testSMA_100 = new SMA(100);
      });
      it('should have the correct period set', function() {
        expect(testSMA.period).to.equal(10);
        expect(testSMA_15.period).to.equal(15);
        expect(testSMA_100.period).to.equal(100);
      });
      it('should start out with isValid flag as false', function() {
        expect(testSMA.isValid).to.equal(false);
      });
      it('should not calculate an SMA if called less than period', function() {
        testSMA.update(testData[0]);
        expect(testSMA.last).to.equal(0);
        expect(testSMA.isValid).to.equal(false);
        testSMA.update(testData[1]);
        expect(testSMA.last).to.equal(0);
        expect(testSMA.isValid).to.equal(false);
        testSMA.update(testData[2]);
        expect(testSMA.last).to.equal(0);
        expect(testSMA.isValid).to.equal(false);
        testSMA.update(testData[3]);
        expect(testSMA.last).to.equal(0);
        expect(testSMA.isValid).to.equal(false);
        testSMA.update(testData[4]);
        expect(testSMA.last).to.equal(0);
        expect(testSMA.isValid).to.equal(false);
        testSMA.update(testData[5]);
        expect(testSMA.last).to.equal(0);
        expect(testSMA.isValid).to.equal(false);
        testSMA.update(testData[6]);
        expect(testSMA.last).to.equal(0);
        expect(testSMA.isValid).to.equal(false);
        testSMA.update(testData[7]);
        expect(testSMA.last).to.equal(0);
        expect(testSMA.isValid).to.equal(false);
        testSMA.update(testData[8]);
        expect(testSMA.last).to.equal(0);
        expect(testSMA.isValid).to.equal(false);
      });
      it('should return the SMA on the nth call where n is the period', function() {
        testSMA.update(testData[9]);
        expect(testSMA.last).to.equal(22.22475);
      });
      it('should set isValid flag to true', function() {
        expect(testSMA.isValid).to.equal(true);
      });
      it('should return the SMA on the nth+1 call', function() {
        testSMA.update(testData[10]);
        expect(testSMA.last).to.equal(22.21283);
      });
      it('should return the SMA on the nth+1 call', function() {
        testSMA.update(testData[11]);
        expect(testSMA.last).to.equal(22.23269);
      });
      it('should return the SMA on the nth+1 call', function() {
        testSMA.update(testData[12]);
        expect(testSMA.last).to.equal(22.26238);
      });
    });
    describe('Parabolic SAR', function() {
      var testPSAR;
      before( function() {
        testPSAR = new PSAR(0.02, 0.2);
      });
      it('should start out with isValid flag as false', function() {
        expect(testPSAR.isValid).to.equal(false);
      });
      it('should not calculate a SAR if called less than 5 times', function() {
        testPSAR.update(testData2[0]);
        expect(testPSAR.last).to.equal(0);
        expect(testPSAR.isValid).to.equal(false);
        testPSAR.update(testData2[1]);
        expect(testPSAR.last).to.equal(0);
        expect(testPSAR.isValid).to.equal(false);
        testPSAR.update(testData2[2]);
        expect(testPSAR.last).to.equal(0);
        expect(testPSAR.isValid).to.equal(false);
        testPSAR.update(testData2[3]);
        expect(testPSAR.last).to.equal(0);
        expect(testPSAR.isValid).to.equal(false);
      });
      it('should return the SAR on the 5th call', function() {
        testPSAR.update(testData2[4]);
        expect(testPSAR.last).to.equal(9.350);
      });
      it('should set isValid flag to true', function() {
        expect(testPSAR.isValid).to.equal(true);
      });
      it('should handle downward trends', function() {
        testPSAR.update(testData2[5]);
        expect(testPSAR.last).to.equal(9.350);
        testPSAR.update(testData2[6]);
        expect(testPSAR.last).to.equal(10.330);
        testPSAR.update(testData2[7]);
        expect(testPSAR.last).to.equal(10.2768);
        testPSAR.update(testData2[8]);
        expect(testPSAR.last).to.equal(10.225728);
        testPSAR.update(testData2[9]);
        expect(testPSAR.last).to.equal(10.17669888);
        testPSAR.update(testData2[10]);
        expect(testPSAR.last).to.equal(10.1030969472);
        testPSAR.update(testData2[11]);
        expect(testPSAR.last).to.equal(10.033911130367999);
      });
      it('should be able to handle a reversal in trend', function() {
        testPSAR.update(testData2[12]);
        expect(testPSAR.last).to.equal(8.950);
      });
      it('should handle upward trends', function() {
        testPSAR.update(testData2[13]);
        expect(testPSAR.last).to.equal(8.9964);
        testPSAR.update(testData2[14]);
        expect(testPSAR.last).to.equal(9.086616);
        testPSAR.update(testData2[15]);
        expect(testPSAR.last).to.equal(9.25968672);
        testPSAR.update(testData2[16]);
        expect(testPSAR.last).to.equal(9.490718048);
        testPSAR.update(testData2[17]);
        expect(testPSAR.last).to.equal(9.698646243199999);
        testPSAR.update(testData2[18]);
        expect(testPSAR.last).to.equal(9.950808694015999);
        testPSAR.update(testData2[19]);
        expect(testPSAR.last).to.equal(10.22369547685376);
        testPSAR.update(testData2[20]);
        expect(testPSAR.last).to.equal(10.498304200557158);
        testPSAR.update(testData2[21]);
        expect(testPSAR.last).to.equal(10.728975528468013);
        testPSAR.update(testData2[22]);
        expect(testPSAR.last).to.equal(10.92273944391313);
        testPSAR.update(testData2[23]);
        expect(testPSAR.last).to.equal(11.94);
        testPSAR.update(testData2[24]);
        expect(testPSAR.last).to.equal(11.906799999999999);
      });
    });
  });
});

describe('StateMachine', function() {
  describe('State: Watching', function() {
    it('should have an idle/Watching state to watch');
    it('should initialize to Watching State on creation/initialization');
  });
  describe('State: InPlay', function() {
    it('should have an In Play state');


  });
  describe('State: LongPosition', function() {
    it('should have a Long Position State');

  });
  describe('State: ShortPosition', function() {
    it('should have a Short Position State');

  });
  describe('State: CompletedTrade', function() {
    it('should have a Complete Trade State');

  });
  describe('Watchdog', function() {
    it('should have a watchdog');
  });
});
