import {
  Environment,
  Platform,
  platformFromString,
  DismissBlockingDialog,
  SNAlertService,
  SNApplication,
  DeviceInterface,
  EncryptionIntent,
  BackupFile,
  SNLog
} from '@standardnotes/snjs';
import { SNWebCrypto } from '@standardnotes/sncrypto-web';

declare const JSZip: any;

SNLog.onLog = console.log;
SNLog.onError = console.error;

const KEYCHAIN_STORAGE_KEY = 'keychain';

class WebDeviceInterface extends DeviceInterface {
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
    this.storage[KEYCHAIN_STORAGE_KEY];
  }
}

function getPlatformString() {
  try {
    const platform = navigator.platform.toLowerCase();
    let trimmed = '';
    if (platform.indexOf('mac') !== -1) {
      trimmed = 'mac';
    } else if (platform.indexOf('win') !== -1) {
      trimmed = 'windows';
    }
    if (platform.indexOf('linux') !== -1) {
      trimmed = 'linux';
    }
    return trimmed + '-web';
  } catch (e) {
    return 'unknown-platform';
  }
}

class WebAlertService implements SNAlertService {
  confirm(): Promise<boolean> {
    throw new Error('Method not implemented.');
  }
  alert(): Promise<void> {
    throw new Error('Method not implemented.');
  }
  blockingDialog(): DismissBlockingDialog | Promise<DismissBlockingDialog> {
    throw new Error('Method not implemented.');
  }
}

async function createApplication() {
  const application = new SNApplication(
    Environment.Web,
    platformFromString(getPlatformString()) || Platform.LinuxWeb,
    new WebDeviceInterface(),
    new SNWebCrypto(),
    new WebAlertService(),
    'decrypt-script'
  );
  application.enableEphemeralPersistencePolicy();
  await application.prepareForLaunch({
    receiveChallenge() {
      throw new Error('Method not implemented.');
    },
  });
  return application;
}

let files: FileList | null;
document.getElementById('chooser')!.addEventListener(
  'change',
  (event) => {
    files = (event.target as HTMLInputElement).files;
  },
  false
);

document
  .getElementById('download-import-file')!
  .addEventListener('click', downloadAsImportFile);
document
  .getElementById('download-plain-text')!
  .addEventListener('click', downloadAsPlain);

async function createDecryptedBackup() {
  if (!files) {
    alert('You must select a file first.');
    return;
  }
  const data = await readFile(files[0]);

  const application = await createApplication();

  await application.importData(data as BackupFile, getPassword());
  const backupFile = application.createBackupFile(
    undefined,
    EncryptionIntent.FileDecrypted
  );
  await application.signOut();
  return backupFile;
}

function getPassword(): string {
  return (document.getElementById('password')! as HTMLInputElement).value;
}

async function downloadAsImportFile() {
  try {
    const decryptedBackup = await createDecryptedBackup();
    if (decryptedBackup) {
      downloadData(decryptedBackup, 'decrypted-sn-data.txt', false);
    }
  } catch (e) {
    console.error(e);
    alert(
      'An error occurred while trying to decrypt your data.' +
        ' Ensure your password is correct and try again.'
    );
  }
}

async function downloadAsPlain() {
  try {
    const decryptedBackup = await createDecryptedBackup();
    if (decryptedBackup) {
      downloadPlaintextDataZip(
        JSON.parse(decryptedBackup),
        'decrypted-sn-data'
      );
    }
  } catch (e) {
    console.error(e);
    alert(
      'An error occurred while trying to decrypt your data.' +
        ' Ensure your password is correct and try again.'
    );
  }
}

async function readFile(file: Blob): Promise<any> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(JSON.parse(e.target!.result as string));
    };
    reader.readAsText(file);
  });
}

function downloadData(data: any, filename: string, json: boolean) {
  if (json) {
    data = JSON.stringify(data, null, 2 /* pretty print */);
  }
  data = new Blob([data], { type: 'text/json' });

  const link = document.createElement('a');
  link.setAttribute('download', filename);
  link.href = window.URL.createObjectURL(data);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function downloadPlaintextDataZip(data: BackupFile, filename: string) {
  const zip = new JSZip();
  for (const item of data.items) {
    let name: string;
    let contents: string;

    if (item.content_type == 'Note') {
      name = item.content.title;
      contents = item.content.text;
    } else {
      name = item.content_type;
      contents = JSON.stringify(item.content, null, 2);
    }

    if (!name) {
      name = '';
    }

    // Remove slashes
    name = name.replace(/\//g, '').replace(/\\+/g, '');

    // ('-' + first section of UUID + '.txt')
    const filenameEnd = `-${item.uuid.split('-')[0]}.txt`;

    // Standard max filename length is 255
    // Slice the note name down to allow filenameEnd
    name = name.slice(0, 255 - filenameEnd.length);

    name = `${item.content_type}/${name}${filenameEnd}`;
    zip.file(name, contents);
  }

  zip.generateAsync({ type: 'blob' }).then(function (content: any) {
    downloadData(content, filename + '.zip', false);
  });
}
