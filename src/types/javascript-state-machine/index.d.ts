// Type definitions for javascript-state-machine v3.0
// Project: javascript-state-machine
// Definitions by: Michael Sutherland <[~A URL FOR YOU~]>

/*~ This is the module template file for class modules.
 *~ You should rename it to index.d.ts and place it in a folder with the same name as the module.
 *~ For example, if you were writing a file for "super-greeter", this
 *~ file should be 'super-greeter/index.d.ts'
 */

/*~ Note that ES6 modules cannot directly export class objects.
 *~ This file should be imported using the CommonJS-style:
 *~   import x = require('someLibrary');
 *~
 *~ Refer to the documentation to understand common
 *~ workarounds for this limitation of ES6 modules.
 */

/*~ If this module is a UMD module that exposes a global variable 'myClassLib' when
 *~ loaded outside a module loader environment, declare that global here.
 *~ Otherwise, delete this declaration.
 */
//export as namespace StateMachine;

/*~ This declaration specifies that the class constructor function
 *~ is the exported object from the file
 */

declare module 'javascript-state-machine' {

  export = StateMachine;
  /*~ Write your module's methods and properties in this class */
  class StateMachine {
    constructor(config: StateMachine.StateMachineConfig);

    state: string;

    observe(event: string, cb: (lifecycle: StateMachine.LifeCycle, extra?: any[]) => void): void;
    init(): void;
    restart(): void;
    start(): void;
    stop(): void;
    idle(): void;
    redbutton(): void;
    reset(): void;
    exit(): void;
  }

  /*~ If you want to expose types from your module as well, you can
  *~ place them in this block.
  */
  namespace StateMachine {

    export interface StateMachineConfig {
      init?: string;
      transitions?: Transition[];
      methods?: { [index: string]: () => void };
    }

    export interface Transition {
      name: string;
      from: string;
      to: string;
    }

    export interface LifeCycle {
      from: string;
      to: string;
      transition: string;
    }
  }
}