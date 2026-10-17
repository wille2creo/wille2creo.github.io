import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, readdir, access, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { publishBundle } from '../bundle.mjs';

test('failed and successful reruns preserve whole bundle versions', async () => {
  const work = await mkdtemp(path.join(os.tmpdir(), 'wechat-bundle-'));
  const destination = path.join(work, 'article');
  try {
    await assert.rejects(publishBundle(destination, async staging => {
      await writeFile(path.join(staging, 'body.md'), 'incomplete');
      throw new Error('missing image');
    }), /missing image/);
    await assert.rejects(access(destination));
    assert.deepEqual(await readdir(work), []);

    await publishBundle(destination, async staging => {
      for (const name of ['body.md', 'article.html', 'manifest.json', 'old.jpg']) {
        await writeFile(path.join(staging, name), 'old complete bundle');
      }
    });
    await assert.rejects(publishBundle(destination, async staging => {
      await writeFile(path.join(staging, 'body.md'), 'new incomplete body');
      assert.equal(await readFile(path.join(destination, 'body.md'), 'utf8'),
        'old complete bundle');
      throw new Error('missing image');
    }), /missing image/);
    for (const name of await readdir(destination)) {
      assert.equal(await readFile(path.join(destination, name), 'utf8'),
        'old complete bundle');
    }
    assert.deepEqual(await readdir(work), ['article']);

    await publishBundle(destination, async staging => {
      await writeFile(path.join(staging, 'body.md'), 'new complete bundle');
      await writeFile(path.join(staging, 'article.html'), 'new complete bundle');
    });
    assert.deepEqual((await readdir(destination)).sort(), ['article.html', 'body.md']);
    assert.equal(await readFile(path.join(destination, 'body.md'), 'utf8'),
      'new complete bundle');
    assert.deepEqual(await readdir(work), ['article']);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});
