export type PlaidProxyErrorCode =
  'notConfigured' | 'invalidURL' | 'http' | 'decoding';

export class PlaidProxyError extends Error {
  code: PlaidProxyErrorCode;

  constructor(message: string, code: PlaidProxyErrorCode) {
    super(message);
    this.name = 'PlaidProxyError';
    this.code = code;
  }
}
