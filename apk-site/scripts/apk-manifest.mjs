// Android's manifest inside an APK is binary XML (AXML). This walks just enough of that format to
// pull the <manifest> attributes — package, versionName, versionCode — out of the file.
import { inflateRawSync } from 'node:zlib';

const RES_STRING_POOL = 0x0001;
const RES_XML_START_ELEMENT = 0x0102;
const TYPE_STRING = 0x03;
const TYPE_INT_DEC = 0x10;
const TYPE_INT_HEX = 0x11;
const UTF8_FLAG = 0x100;
const NO_ENTRY = 0xffffffff;

const u16 = (buf, at) => buf.readUInt16LE(at);
const u32 = (buf, at) => buf.readUInt32LE(at);

/** Reads a pool string length, which is 1 byte (UTF-8) or 2 bytes unless the top bit says 4. */
const readLength = (buf, at, isUtf8) => {
  if (isUtf8) {
    const first = buf[at];
    return first & 0x80 ? [((first & 0x7f) << 8) | buf[at + 1], at + 2] : [first, at + 1];
  }
  const first = u16(buf, at);
  return first & 0x8000 ? [((first & 0x7fff) << 16) | u16(buf, at + 2), at + 4] : [first, at + 2];
};

const readStringPool = (buf, start) => {
  const count = u32(buf, start + 8);
  const flags = u32(buf, start + 16);
  const stringsStart = u32(buf, start + 20);
  const isUtf8 = (flags & UTF8_FLAG) !== 0;
  const offsetsAt = start + 28;
  const dataStart = start + stringsStart;
  const strings = new Array(count);

  for (let i = 0; i < count; i++) {
    const offset = u32(buf, offsetsAt + i * 4);
    if (offset === NO_ENTRY) continue;
    let at = dataStart + offset;
    if (isUtf8) {
      [, at] = readLength(buf, at, true); // skip the UTF-16 length
      const [byteLength, body] = readLength(buf, at, true);
      strings[i] = buf.toString('utf8', body, body + byteLength);
    } else {
      const [charLength, body] = readLength(buf, at, false);
      strings[i] = buf.toString('utf16le', body, body + charLength * 2);
    }
  }

  return strings;
};

/** Collects the attributes of one start-element chunk. */
const readElement = (buf, start, strings) => {
  const headerSize = u16(buf, start + 2);
  const nameIndex = u32(buf, start + 20);
  const attributeStart = u16(buf, start + 24);
  const attributeSize = u16(buf, start + 26);
  const attributeCount = u16(buf, start + 28);
  const attributes = new Map();
  const base = start + headerSize + attributeStart;

  for (let i = 0; i < attributeCount; i++) {
    const at = base + i * attributeSize;
    const attrName = strings[u32(buf, at + 4)];
    const rawValue = u32(buf, at + 8);
    const dataType = buf[at + 15];
    const data = u32(buf, at + 16);
    if (dataType === TYPE_STRING) {
      const value = rawValue !== NO_ENTRY ? strings[rawValue] : strings[data];
      if (value !== undefined) attributes.set(attrName, value);
    } else if (dataType === TYPE_INT_DEC || dataType === TYPE_INT_HEX) {
      attributes.set(attrName, data);
    }
  }

  return { name: strings[nameIndex], attributes };
};

/** Finds a zip entry's decompressed bytes by walking the central directory. */
const readZipEntry = (apk, wanted) => {
  let zipAt = apk.length - 22;
  while (zipAt >= 0 && u32(apk, zipAt) !== 0x06054b50) zipAt--;
  if (zipAt < 0) throw new Error('APK is not a zip archive');

  const directoryAt = u32(apk, zipAt + 16);
  const entryCount = u16(apk, zipAt + 10);
  let at = directoryAt;

  for (let i = 0; i < entryCount; i++) {
    const nameLength = u16(apk, at + 28);
    const extraLength = u16(apk, at + 30);
    const commentLength = u16(apk, at + 32);
    const name = apk.toString('utf8', at + 46, at + 46 + nameLength);

    if (name === wanted) {
      const localAt = u32(apk, at + 42);
      const method = u16(apk, at + 10);
      const compressedSize = u32(apk, at + 20);
      const localNameLength = u16(apk, localAt + 26);
      const localExtraLength = u16(apk, localAt + 28);
      const dataAt = localAt + 30 + localNameLength + localExtraLength;
      const stored = apk.subarray(dataAt, dataAt + compressedSize);
      return method === 0 ? stored : inflateRawSync(stored);
    }

    at += 46 + nameLength + extraLength + commentLength;
  }

  throw new Error(`APK has no ${wanted}`);
};

/** Pulls package, versionName and versionCode from an APK's binary AndroidManifest.xml. */
export const readManifest = apk => {
  const manifest = readZipEntry(apk, 'AndroidManifest.xml');
  let strings = [];
  let offset = u16(manifest, 2);

  while (offset + 8 <= manifest.length) {
    const type = u16(manifest, offset);
    const chunkSize = u32(manifest, offset + 4);
    if (chunkSize <= 0) break;

    if (type === RES_STRING_POOL) {
      strings = readStringPool(manifest, offset);
    } else if (type === RES_XML_START_ELEMENT && strings.length) {
      const element = readElement(manifest, offset, strings);
      if (element.name === 'manifest') {
        return {
          packageName: element.attributes.get('package') ?? null,
          versionName: element.attributes.get('versionName') ?? null,
          versionCode: element.attributes.get('versionCode') ?? null
        };
      }
    }

    offset += chunkSize;
  }

  throw new Error('No <manifest> element found');
};
