import simpleGit from 'simple-git';
import * as path from 'path';

/**
 * Commits the given files in the repository that contains them.
 * No-op if the files have no staged/unstaged changes or if the directory
 * is not a git repository.
 */
export async function commitContextFiles(filePaths: string[]): Promise<void> {
  if (filePaths.length === 0) return;

  // Use the directory of the first file as the git repo root candidate
  const repoDir = path.dirname(filePaths[0]);
  const git = simpleGit(repoDir);

  const isRepo = await git.checkIsRepo().catch(() => false);
  if (!isRepo) return;

  // Stage only the context files that actually changed
  await git.add(filePaths);

  const status = await git.status();
  const staged = status.staged;
  if (staged.length === 0) return;

  await git.commit('chore: update context-keeper decisions', filePaths, {
    '--no-verify': null,
  });
}
