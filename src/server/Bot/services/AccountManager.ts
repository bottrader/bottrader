import { ExchangeAuthConfig } from "gdax-trading-toolkit/build/src/exchanges/AuthConfig";
import { GDAXAuthConfig } from 'gdax-trading-toolkit/build/src/exchanges/gdax/GDAXInterfaces';
import { v1 as uuid } from 'uuid';
import 'core-js/library';

export class Auth implements ExchangeAuthConfig {
  private _name: string;
  private _exchangeId: string;
  private _auth: ExchangeAuthConfig;

  key: string;
  secret: string;
  passphrase: string;

  constructor(name: string, exchangeId: string, auth: ExchangeAuthConfig) {
    this._name = name;
    this._exchangeId = exchangeId;

    this.key = auth.key;
    this.secret = auth.secret;
    this.passphrase = (auth as any).passphrase || null;
  }

  get name(): string {
    return this._name;
  }

  get exchangeId(): string {
    return this._exchangeId;
  }

}

export type AuthEntry = { id: string; name: string };
export type AuthHash = { [id: string]: Auth };

export class AuthManager {
  private _auths: AuthHash;

  constructor() {
    this._auths = {};
  }

  getAuth(accountId: string): Auth | undefined {
    return this._auths[accountId];
  }

  getAuths(): AuthEntry[] | undefined {
    return Object.keys(this._auths).map((id) => ({
      id: id,
      name: this._auths[id].name
    }));
  }

  addAuth<T extends ExchangeAuthConfig>(exchangeId: string, name: string, auth: T): string {
    const strategyId = uuid();
    const entry = new Auth(name, exchangeId, auth);
    this._auths[strategyId] = entry;
    return strategyId;
  }

}

export default new AuthManager();


