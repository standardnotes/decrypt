export function getPlatformString() {
  try {
    const platform = navigator.platform.toLowerCase();
    let trimmed = '';
    if (platform.indexOf('mac') !== -1) {
      trimmed = 'mac';
    } else if (platform.indexOf('win') !== -1) {
      trimmed = 'windows';
    } else if (platform.indexOf('linux') !== -1) {
      trimmed = 'linux';
    }
    return trimmed + '-web';
  } catch (e) {
    return 'unknown-platform';
  }
}

export function getPackageVersion(): string {
  const { version } = require('./../package.json');
  return version;
}

export function sanitizeFileName(name: string): string {
  return name.trim().replace(/[.\\/:"?*|<>]/g, '_');
}

export function zippableTxtName(name: string, suffix = ''): string {
  const sanitizedName = sanitizeFileName(name);
  const nameEnd = suffix + '.txt';
  const maxFileNameLength = 100;
  return sanitizedName.slice(0, maxFileNameLength - nameEnd.length) + nameEnd;
}

export async function readFile(file: Blob): Promise<any> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(JSON.parse(e.target!.result as string));
    };
    reader.readAsText(file);
  });
}
