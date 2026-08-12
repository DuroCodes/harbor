#!/usr/bin/env bun
/**
 * Reads `eas build --json` output and downloads APK/IPA artifacts into an output dir.
 *
 * Usage: bun scripts/download-eas-artifacts.ts <builds.json> <outDir>
 */

import { mkdir } from 'node:fs/promises';
import path from 'node:path';

type EasBuild = {
  id?: string;
  platform?: string;
  status?: string;
  artifacts?: {
    buildUrl?: string;
    applicationArchiveUrl?: string;
  };
};

const [, , buildsPath, outDir] = process.argv;

if (!buildsPath || !outDir) {
  console.error(
    'usage: bun scripts/download-eas-artifacts.ts <builds.json> <outDir>'
  );
  process.exit(1);
}

const raw = await Bun.file(buildsPath).text();
const parsed = JSON.parse(raw) as EasBuild | EasBuild[];
const builds = Array.isArray(parsed) ? parsed : [parsed];

await mkdir(outDir, { recursive: true });

let downloaded = 0;

for (const build of builds) {
  const url =
    build.artifacts?.applicationArchiveUrl ?? build.artifacts?.buildUrl;
  if (!url) {
    console.warn(
      `skip ${build.id ?? '?'}: no artifact url (status=${build.status})`
    );
    continue;
  }
  if (build.status && build.status !== 'FINISHED') {
    console.warn(`skip ${build.id}: status=${build.status}`);
    continue;
  }

  const platform = (build.platform ?? 'unknown').toLowerCase();
  const ext =
    platform === 'ios' ? 'ipa' : platform === 'android' ? 'apk' : 'bin';
  const filename = `harbor-${platform}.${ext}`;
  const dest = path.join(outDir, filename);

  console.log(`downloading ${platform} → ${filename}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`download failed (${res.status}): ${url}`);
  }
  await Bun.write(dest, res);
  downloaded += 1;
}

if (downloaded === 0) {
  throw new Error('no artifacts downloaded');
}

console.log(`downloaded ${downloaded} artifact(s) into ${outDir}`);
