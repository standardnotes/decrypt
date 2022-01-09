import './assets/styles/main.scss';

import {
  Environment,
  Platform,
  platformFromString,
  SNApplication,
  EncryptionIntent,
  BackupFile,
  SNLog,
  ChallengeReason,
  ChallengeValue,
} from '@standardnotes/snjs';
import { SNWebCrypto } from '@standardnotes/sncrypto-web';

import {
  getPackageVersion,
  getPlatformString,
  sanitizeFileName,
  zippableTxtName,
  readFile
} from './utils';
import WebDeviceInterface from './deviceInterface';
import WebAlertService from './alertService';

import * as JSZip from 'jszip/dist/jszip.min.js';

SNLog.onLog = console.log;
SNLog.onError = console.error;

async function createApplication() {
  const application = new SNApplication(
    Environment.Web,
    platformFromString(getPlatformString()) || Platform.LinuxWeb,
    new WebDeviceInterface(),
    new SNWebCrypto(),
    new WebAlertService(),
    'decrypt-script',
    [],
    'offline-host',
    getPackageVersion()
  );

  await application.enableEphemeralPersistencePolicy();
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

const selectedFileEl = document.getElementById(
  'selected-file'
) as HTMLUListElement;

let selectedFile: File | null;
document.getElementById('chooser')!.addEventListener(
  'change',
  (event) => {
    const files = (event.target as HTMLInputElement).files;

    const hasSelectedFiles = files.length > 0;
    selectedFileEl.style.display = hasSelectedFiles ? 'block' : 'none';

    if (!hasSelectedFiles) {
      return;
    }

    selectedFile = files[0];
    selectedFileEl.innerText = selectedFile.name;
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
  if (!selectedFile) {
    alert('You must select a file first.');
    return;
  }

  const data = await readFile(selectedFile);
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

function clearPassword() {
  (document.getElementById('password')! as HTMLInputElement).value = '';
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

  clearPassword();
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
