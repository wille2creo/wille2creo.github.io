import { mkdir, mkdtemp, rename, rm } from 'node:fs/promises';
import path from 'node:path';

// Build off to the side. Only a complete bundle can replace the live directory.
export async function publishBundle(destination, generate) {
  const parent = path.dirname(destination);
  await mkdir(parent, { recursive: true });
  const staging = await mkdtemp(path.join(parent, '.build-'));
  const bundle = path.join(staging, 'bundle');
  const previous = path.join(staging, 'previous');
  let displaced = false;
  try {
    await mkdir(bundle);
    const result = await generate(bundle);
    try {
      await rename(destination, previous);
      displaced = true;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    try {
      await rename(bundle, destination);
    } catch (error) {
      if (displaced) {
        // If restoring also fails, preserve the backup for recovery.
        await rename(previous, destination).catch(restoreError => {
          throw new Error(`无法恢复旧产物，备份保留在 ${previous}`, {
            cause: new AggregateError([error, restoreError]),
          });
        });
        displaced = false;
      }
      throw error;
    }
    displaced = false;
    return result;
  } finally {
    if (!displaced) await rm(staging, { recursive: true, force: true });
  }
}
