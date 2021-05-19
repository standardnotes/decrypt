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
  SNLog,
  ChallengeReason,
  ChallengeValue,
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
    'decrypt-script',
    [],
    'offline-host'
  );
  application.enableEphemeralPersistencePolicy();
  await application.prepareForLaunch({
    receiveChallenge(challenge) {
      if (challenge.reason === ChallengeReason.DecryptEncryptedFile) {
        application.submitValuesForChallenge(challenge, [
          new ChallengeValue(challenge.prompts[0], getPassword()),
        ]);
      } else {
        throw new Error(
          `Unknown challenge reason ${ChallengeReason[challenge.reason]}`
        );
      }
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

const downloadAsImportFileEl = document.getElementById(
  'download-import-file'
) as HTMLButtonElement;
downloadAsImportFileEl.addEventListener('click', async () => {
  try {
    showProgressIndicator();
    await downloadAsImportFile();
  } finally {
    hideProgressIndicator();
  }
});

const downloadAsPlainEl = document.getElementById(
  'download-plain-text'
) as HTMLButtonElement;
downloadAsPlainEl.addEventListener('click', async () => {
  try {
    showProgressIndicator();
    await downloadAsPlain();
  } finally {
    hideProgressIndicator();
  }
});

const downloadButtons = [downloadAsImportFileEl, downloadAsPlainEl];

const progressIndicator = document.getElementById('progress-indicator');

function showProgressIndicator() {
  for (const button of downloadButtons) {
    button.disabled = true;
  }
  progressIndicator.style.display = 'block';
}

function hideProgressIndicator() {
  for (const button of downloadButtons) {
    button.disabled = false;
  }
  progressIndicator.style.display = 'none';
}

async function createDecryptedBackup(): Promise<BackupFile> {
  if (!files) {
    alert('You must select a file first.');
    return;
  }
  const data = await readFile(files[0]);

  const application = await createApplication();

  const result = await application.importData(data as BackupFile);
  if ('error' in result) {
    throw Error(result.error);
  } else if (result.errorCount) {
    if (result.affectedItems.length === 0) {
      throw Error('No item could be decrypted.');
    } else {
      alert(
        `${result.errorCount} items could not be decrypted. ` +
          `Please make sure the password you entered is correct, and try again.`
      );
    }
  }
  const backupFile = application.createBackupFile(
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
      downloadData(
        JSON.stringify(decryptedBackup, null, 2),
        'decrypted-sn-data.txt'
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

async function downloadAsPlain() {
  try {
    const decryptedBackup = await createDecryptedBackup();
    if (decryptedBackup) {
      downloadPlaintextDataZip(decryptedBackup, 'decrypted-sn-data');
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

function downloadData(data: object | string, filename: string) {
  if (typeof data !== 'object' && typeof data !== 'string') {
    throw Error('Unknown data format: ' + data);
  }

  const blob = new Blob([data as BlobPart], { type: 'text/json' });

  const link = document.createElement('a');
  link.setAttribute('download', filename);
  link.href = window.URL.createObjectURL(blob);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function downloadPlaintextDataZip(data: BackupFile, filename: string) {
  const zip = new JSZip();

  zip.file(
    zippableTxtName('Standard Notes Backup and Import File'),
    JSON.stringify(data, null, 2)
  );

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
    name = zippableTxtName(name, `-${item.uuid.split('-')[0]}`);

    name = `${sanitizeFileName(item.content_type)}/${name}`;

    zip.file(name, contents);
  }

  zip.generateAsync({ type: 'blob' }).then(function (content: any) {
    downloadData(content, filename + '.zip');
  });
}

function sanitizeFileName(name: string): string {
  return name.trim().replace(/[.\\/:"?*|<>]/g, '_');
}

function zippableTxtName(name: string, suffix = ''): string {
  const sanitizedName = sanitizeFileName(name);
  const nameEnd = suffix + '.txt';
  const maxFileNameLength = 100;
  return sanitizedName.slice(0, maxFileNameLength - nameEnd.length) + nameEnd;
}
