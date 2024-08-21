import { BasicAuth, ICredentials } from '@c8y/client';

const secrets = new WeakMap();

export class BearerAuth extends BasicAuth {
  override getFetchOptions(options: any): any {
    const secret = secrets.get(this);
    const { token } = secret;
    options.headers = Object.assign({ Authorization: `Bearer ${token}` }, options.headers);
    return options;
  }

  override updateCredentials({ tenant, user, password, token, tfa }: ICredentials = {}) {
    const secret = secrets.get(this) || {};
    if (user && tenant) {
      user = `${tenant}/${user}`;
    }
    user = user || this.user;
    password = password || secret.password;
    if (!token && user && password) {
      token = btoa(`${user}:${password}`);
    }
    if (user) {
      this.user = user;
    }
    token = token || secret.token;
    tfa = tfa || secret.tfa;
    secrets.set(this, { tfa, token, password });
    return token as string;
  }

  override getCometdHandshake(config: { ext?: any } = {}) {
    const secret = secrets.get(this);
    const { token, tfa } = secret;
    const KEY = 'com.cumulocity.authn';
    const ext = (config.ext = config.ext || {});
    const auth = (ext[KEY] = Object.assign(ext[KEY] || {}, { token, tfa }));
    return config;
  }

  override logout(): void {
    delete this.user;
    secrets.set(this, {});
  }

  millisecondsUtilTokenExpires(): number {
    const secret = secrets.get(this);
    const { token } = secret;
    try {
      const jwt = this.parseJwt(token);
      if (jwt && jwt.exp && typeof jwt.exp === 'number') {
        return jwt.exp * 1000 - new Date().getTime();
      }
    } catch (e) {
      console.error('Unable to parse JWT');
    }
    return 0;
  }

  private parseJwt(token: string): any {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      return null;
    }
  }
}
