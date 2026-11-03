// Upload the browser bundles to the Embedly CDN bucket under versioned names,
// as the old `grunt release` task did:
//
//   dist/player.js     -> player-<version>.js
//   dist/player.min.js -> player-<version>.min.js
//
// plus their source maps (player-<version>.js.map, ...), with each bundle's
// sourceMappingURL rewritten to the versioned map name.
//
// Usage:
//   npm run release:cdn -- --dry-run   # show what would be uploaded
//   npm run release:cdn                # upload (needs AWS credentials)
//
// Credentials come from the standard AWS chain (AWS_PROFILE, AWS_ACCESS_KEY_ID
// / AWS_SECRET_ACCESS_KEY, SSO, ...). Set CDN_BUCKET to override the bucket.
//
// Released files are immutable: if any file for this version already exists
// in the bucket, nothing is uploaded. Bump the version in package.json first,
// or pass --force to overwrite (e.g. to fix a broken upload).

import { readFile } from 'node:fs/promises';
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const BUCKET = process.env.CDN_BUCKET ?? 'cdn-embed-ly';
// Same as the Grunt config: short cache so a bad upload can be replaced.
const CACHE_CONTROL = 'max-age=300, public';
const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');

const root = new URL('..', import.meta.url);
const { version } = JSON.parse(await readFile(new URL('package.json', root), 'utf8')) as {
  version: string;
};

interface Upload {
  key: string;
  body: Buffer | string;
  contentType: string;
}

const uploads: Upload[] = [];
for (const name of ['player', 'player.min']) {
  const versioned = name.replace('player', `player-${version}`);
  const js = await readFile(new URL(`dist/${name}.js`, root), 'utf8');
  const map = await readFile(new URL(`dist/${name}.js.map`, root));

  const mapComment = `//# sourceMappingURL=${name}.js.map`;
  if (!js.includes(mapComment)) {
    throw new Error(
      `dist/${name}.js has no "${mapComment}" comment; was it built with sourcemaps?`,
    );
  }

  uploads.push(
    {
      key: `${versioned}.js`,
      body: js.replace(mapComment, `//# sourceMappingURL=${versioned}.js.map`),
      contentType: 'application/javascript; charset=utf-8',
    },
    { key: `${versioned}.js.map`, body: map, contentType: 'application/json' },
  );
}

console.log(`${dryRun ? '[dry run] ' : ''}Uploading player.js ${version} to s3://${BUCKET}`);
const s3 = dryRun ? null : new S3Client({});

// Don't overwrite a released version unless asked to.
if (s3 && !force) {
  const existing: string[] = [];
  for (const u of uploads) {
    try {
      await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: u.key }));
      existing.push(u.key);
    } catch (err) {
      if ((err as { name?: string }).name !== 'NotFound') {
        throw err;
      }
    }
  }
  if (existing.length > 0) {
    console.error(
      `Refusing to overwrite released files: ${existing.join(', ')}.\n` +
        'Bump the version in package.json, or pass --force to overwrite.',
    );
    process.exit(1);
  }
} else if (dryRun) {
  console.log('  (not checking whether these already exist in the bucket)');
}

for (const u of uploads) {
  console.log(`  ${u.key} (${Buffer.byteLength(u.body)} bytes)`);
  await s3?.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: u.key,
      Body: u.body,
      ContentType: u.contentType,
      CacheControl: CACHE_CONTROL,
      ACL: 'public-read',
    }),
  );
}
console.log(dryRun ? 'Nothing uploaded (dry run).' : 'Done.');
