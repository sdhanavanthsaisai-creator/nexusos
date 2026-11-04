// One place describes the release, and it is not a config file: the APK itself. Everything the
// download page prints is read from the file it serves, so a new build can never leave stale
// version, size or checksum details behind.
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readManifest } from './apk-manifest.mjs';

const IS_APK = /^NexusOS-.*\.apk$/i;

/** Human size, one decimal: 1230391 → "1.2 MB". */
const sizeLabel = bytes => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/** The newest APK, looked for at the repo root first and then in public/. */
const findApk = async rootDir => {
  for (const dir of [rootDir, `${rootDir}/public`]) {
    let files = [];
    try {
      files = await readdir(dir);
    } catch {
      continue;
    }
    const apkFile = files.filter(name => IS_APK.test(name)).sort().pop();
    if (apkFile) return { dir, apkFile };
  }
  throw new Error(`No NexusOS-*.apk found in ${rootDir} or ${rootDir}/public`);
};

/** Version, version code, package, size and SHA-256 of the APK the download buttons serve. */
export const readRelease = async rootDir => {
  const { dir, apkFile } = await findApk(rootDir);
  const apkPath = `${dir}/${apkFile}`;
  const bytes = await readFile(apkPath);

  let manifest = null;
  try {
    manifest = readManifest(bytes);
  } catch (error) {
    console.warn(`[release] could not read ${apkFile}'s manifest (${error.message}); using its name`);
  }

  // The file name carries the version too, which is the fallback when the manifest is unreadable.
  const version = manifest?.versionName ?? apkFile.match(/^NexusOS-(.+)\.apk$/i)?.[1];
  if (!version) throw new Error(`Could not determine the version of ${apkFile}`);
  const versionCode = manifest?.versionCode;

  return {
    apkFile,
    apkPath,
    version,
    versionCode,
    versionLabel: versionCode == null ? version : `${version} (${versionCode})`,
    packageName: manifest?.packageName ?? null,
    sizeBytes: bytes.length,
    sizeLabel: sizeLabel(bytes.length),
    sha256: createHash('sha256').update(bytes).digest('hex')
  };
};
