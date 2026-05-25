export const VAULT_GATEWAY = Symbol('VAULT_GATEWAY');

export interface IVaultGateway {
  getSecretField(path: string, field: string): Promise<string>;
  getSecretKey(path: string): Promise<string>;
}
