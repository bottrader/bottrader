import { Duplex } from 'stream';
import { isStreamMessage, LiveOrderbook, StreamMessage } from 'gdax-trading-toolkit/build/src/core';
import { Logger } from 'gdax-trading-toolkit/build/src/utils/Logger';
import { v1 as uuid } from 'uuid';
import { ExchangeFeed } from 'gdax-trading-toolkit/build/src/exchanges';
import * as StateMachine from 'javascript-state-machine';
import { LifeCycle } from 'javascript-state-machine';
import { TradingStrategy } from '../strategies/TradingStrategy';

export interface TradeLog {};
export interface TradeStats {};

export const STATE_IDLE = 'idle';
export const STATE_INIT = 'init';
export const STATE_RESTART = 'restart';
export const STATE_TRADING = 'trading';
export const STATE_EXIT = 'exit';
export const STATE_ERROR = 'error';

export interface BotConfig {
  name: string;
  strategy: TradingStrategy;
  logger?: Logger;
}

export class Bot extends Duplex {

  private logger: Logger;
  private _name: string;
  private _id: string;
  private _sm: StateMachine;
  private _strategy: TradingStrategy;
  private _handlers: { [index: string]: (msg: StreamMessage) => void };

  constructor(config: BotConfig) {
    super({ objectMode: true });
    
    this._id = uuid();
    this._name = config.name;
    this._strategy = config.strategy;

    this._strategy.bot = {id: this._id, name: this._name};
    this.logger = config.logger;

    // set up StateMachine
    this._sm = new StateMachine({
      init: 'idle',
      transitions: [
        { name: 'init', from: STATE_IDLE, to: STATE_INIT },
        { name: 'restart', from: STATE_IDLE, to: STATE_RESTART },
        { name: 'start', from: STATE_INIT, to: STATE_TRADING },
        { name: 'start', from: STATE_RESTART, to: STATE_TRADING },
        { name: 'stop', from: STATE_TRADING, to: STATE_EXIT },
        { name: 'idle', from: STATE_EXIT, to: STATE_IDLE },
        { name: 'redbutton', from: '*', to: STATE_ERROR },
        { name: 'reset', from: '*', to: STATE_IDLE }
      ]
    });

    // set up internal state handler routing table
    this._handlers = {};
    this._handlers[STATE_INIT] = this._init.bind(this);
    this._handlers[STATE_IDLE] = this._idle.bind(this);
    this._handlers[STATE_RESTART] = this._restart.bind(this);
    this._handlers[STATE_TRADING] = this._trading.bind(this);
    this._handlers[STATE_EXIT] = this._exit.bind(this);
    this._handlers[STATE_ERROR] = this._error.bind(this);

    this._sm.observe('onTransition', (lifecycle: LifeCycle, ...args: any[]) => {
      this.log('info', `Bot ${this.name} Trasitioned: (${lifecycle.from}) -> (${lifecycle.to})`);
      this.emit('Bot.StateTransition', lifecycle.transition, ...args);
    });

    // Bind state transition handlers to state machine so that 
    // they can be called from inside the strategy handlers
    this._sm.init = this._sm.init.bind(this._sm);
    this._sm.restart = this._sm.restart.bind(this._sm);
    this._sm.start = this._sm.start.bind(this._sm);
    this._sm.start = this._sm.start.bind(this._sm);
    this._sm.stop = this._sm.stop.bind(this._sm);
    this._sm.idle = this._sm.idle.bind(this._sm);
    this._sm.redbutton = this._sm.redbutton.bind(this._sm);
    this._sm.reset = this._sm.reset.bind(this._sm);

    this._sm.init();
  }

  log(level: string, message: string, meta?: any) {
    if (!this.logger) {
      return;
    }

    this.logger.log(level, message, meta);
  }

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  set name(name: string) {
    this._name = name;
  }

  get state(): string {
    return this._sm.state;
  }

  getTradeHistory(): TradeLog[] {
    return [];
  }

  getTradeStats(): TradeStats {
    return {};
  }

  stop(timeout?: number): void {
    if (this._sm.state === STATE_TRADING) {
      this._sm.stop();

      if (timeout) {
        setTimeout(() => {
          this._sm.redbutton();
        }, timeout)
      }
    }
  }

  start(): void {
    if (this._sm.state === STATE_IDLE) {
      this._sm.restart();
    }
  }

  reset(): void {
    this._sm.reset();
  }
  
  _read() {
  }

  _write(msg: any, encoding: string, callback: () => void): void {
    
    // Pass it along for others down the line
    this.push(msg);

    // Process the message
    if (!isStreamMessage(msg) || !msg.productId || !(msg.type === 'ticker')) {
      return callback();
    }

    
    if (msg.productId !== this._strategy.productId) {
      return callback();
    }
    
    this._handlers[this._sm.state](msg);

    callback();
  }

  // State Handlers

  private _idle(msg: StreamMessage): void {
    /* no-op */
  }

  private _init(msg: StreamMessage): void {
    try {
      this._strategy.onInit(msg, this._sm.start);
    } catch(err) {
      this.log('error', `Bot->Init: ${err.message}`);
      this._sm.redbutton();
    }
  }

  private _restart(msg: StreamMessage): void {
    try {
      this._strategy.onRestart(msg, this._sm.start);
    } catch(err) {
      this.log('error', `Bot->Restart: ${err.message}`);
      this._sm.redbutton();
    }
  }

  private _trading(msg: StreamMessage): void {
    try {
      this._strategy.onTrade(msg, this._sm.stop);
    } catch(err) {
      this.log('error', `Bot->Trading: ${err.message}`);
      this._sm.redbutton();
    }
  }

  private _exit(msg: StreamMessage): void {
    try {
      this._strategy.onExit(msg, this._sm.idle)
    } catch(err) {
      this.log('error', `Bot->Exit: ${err.message}`);
      this._sm.redbutton();
    }
  }

  private _reset(msg: StreamMessage): void {
    try {
      this._strategy.onRestart(msg, this._sm.start);
    } catch (err) {
      this.log('error', `Bot->Restart: ${err.message}`);
      this._sm.redbutton();
    }
  }

  private _error(msg: StreamMessage): void {
    this._sm.reset();
  }
}






  
