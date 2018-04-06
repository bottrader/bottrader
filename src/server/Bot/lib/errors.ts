export class ExceededRetryCountError extends Error {
  public message: string;
  public extra: any;

  constructor(msg: string, extra?: any) {
    super(msg);

    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.message = msg;
    this.extra = extra;
  }
}

export class CancelPendingEntryError extends Error {

  public message: string;
  public extra: any;

  constructor(msg: string, extra?: any) {
    super(msg);

    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.message = msg;
    this.extra = extra;
  }
}


export class PlaceOrderFailError extends Error {
  public message: string;
  public extra: any;

  constructor(msg: string, extra?: any) {
    super(msg);

    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.message = msg;
    this.extra = extra;
  }
}