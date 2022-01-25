import { DeviceInterface } from '@standardnotes/snjs';

const KEYCHAIN_STORAGE_KEY = 'keychain';

export default class WebDeviceInterface extends DeviceInterface {
  private storage: Record<string, string> = {};

  constructor() {
    super(window.setTimeout, window.setInterval);
  }

  openUrl(): void {
    throw new Error('Method not implemented.');
  }

  async getRawStorageValue(key: string) {
    return this.storage[key];
  }

  async getAllRawStorageKeyValues() {
    return Object.entries(this.storage).map(([key, value]) => ({
      key,
      value,
    }));
  }

  async setRawStorageValue(key: string, value: string) {
    this.storage[key] = value;
  }

  async removeRawStorageValue(key: string) {
    delete this.storage[key];
  }

  async removeAllRawStorageValues() {
    this.storage = {};
  }

  async openDatabase(_identifier: string) {
    return {};
  }

  _getDatabaseKeyPrefix(identifier: any) {
    if (identifier) {
      return `${identifier}-item-`;
    } else {
      return 'item-';
    }
  }

  _keyForPayloadId(id: any, identifier: any) {
    return `${this._getDatabaseKeyPrefix(identifier)}${id}`;
  }

  async getAllRawDatabasePayloads(identifier: any) {
    const models = [];
    for (const key in this.storage) {
      if (key.startsWith(this._getDatabaseKeyPrefix(identifier))) {
        models.push(JSON.parse(this.storage[key]));
      }
    }
    return models;
  }

  async saveRawDatabasePayload(payload: { uuid: any }, identifier: any) {
    this.storage[
      this._keyForPayloadId(payload.uuid, identifier)
    ] = JSON.stringify(payload);
  }

  async saveRawDatabasePayloads(payloads: any, identifier: any) {
    for (const payload of payloads) {
      await this.saveRawDatabasePayload(payload, identifier);
    }
  }

  async removeRawDatabasePayloadWithId(id: any, identifier: any) {
    delete this.storage[this._keyForPayloadId(id, identifier)];
  }

  async removeAllRawDatabasePayloads(identifier: any) {
    for (const key in this.storage) {
      if (key.startsWith(this._getDatabaseKeyPrefix(identifier))) {
        delete this.storage[key];
      }
    }
  }

  /** @keychain */
  async getNamespacedKeychainValue(identifier: string | number) {
    const keychain = await this.getRawKeychainValue();
    if (!keychain) {
      return;
    }
    return keychain[identifier];
  }

  async setNamespacedKeychainValue(value: any, identifier: any) {
    let keychain = await this.getRawKeychainValue();
    if (!keychain) {
      keychain = {};
    }

    this.storage[KEYCHAIN_STORAGE_KEY] = JSON.stringify({
      ...keychain,
      [identifier]: value,
    });
  }

  async clearNamespacedKeychainValue(identifier: string | number) {
    const keychain = await this.getRawKeychainValue();
    if (!keychain) {
      return;
    }
    delete keychain[identifier];
    this.storage[KEYCHAIN_STORAGE_KEY] = JSON.stringify(keychain);
  }

  async getRawKeychainValue() {
    const keychain = this.storage[KEYCHAIN_STORAGE_KEY] || null;
    return JSON.parse(keychain!);
  }

  async legacy_setRawKeychainValue(value: unknown) {
    this.storage[KEYCHAIN_STORAGE_KEY] = JSON.stringify(value);
  }

  async clearRawKeychainValue() {
    this.storage = {};
  }
}
