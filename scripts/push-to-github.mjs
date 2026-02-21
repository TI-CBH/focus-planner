import { Octokit } from '@octokit/rest';
import { readFileSync, statSync, readdirSync } from 'fs';
import { join, relative } from 'path';

const OWNER = 'TI-CBH';
const REPO = 'focus-planner';
const BRANCH = 'main';
const ROOT = '/home/runner/workspace';

const IGNORE_PATTERNS = [
  'node_modules', '.git', 'dist', '.DS_Store', 'server/public',
  '*.tar.gz', 'backend_dev', '.cache', '.config', '.local',
  '.upm', 'generated-icon.png', 'scripts/push-to-github.mjs',
  '.replit', 'replit.nix', '.breakpoints', '__pycache__',
  'frontend/node_modules', 'snippets', '.gitattributes',
  'tmp', '/tmp'
];

function shouldIgnore(filePath) {
  const rel = relative(ROOT, filePath);
  for (const pattern of IGNORE_PATTERNS) {
    if (rel === pattern || rel.startsWith(pattern + '/') || rel.startsWith(pattern)) return true;
    if (pattern.startsWith('*') && rel.endsWith(pattern.slice(1))) return true;
  }
  return false;
}

function getAllFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (shouldIgnore(fullPath)) continue;
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath));
    } else if (entry.isFile()) {
      try {
        const stat = statSync(fullPath);
        if (stat.size > 5 * 1024 * 1024) continue;
        files.push(fullPath);
      } catch { continue; }
    }
  }
  return files;
}

function isBinary(buffer) {
  for (let i = 0; i < Math.min(buffer.length, 8000); i++) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

let connectionSettings;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) throw new Error('X_REPLIT_TOKEN not found');

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    { headers: { 'Accept': 'application/json', 'X_REPLIT_TOKEN': xReplitToken } }
  ).then(r => r.json()).then(d => d.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;
  if (!accessToken) throw new Error('GitHub not connected');
  return accessToken;
}

async function main() {
  console.log('Getting GitHub access token...');
  const token = await getAccessToken();
  const octokit = new Octokit({ auth: token });

  console.log('Collecting project files...');
  const allFiles = getAllFiles(ROOT);
  console.log(`Found ${allFiles.length} files to push`);

  let baseSha;
  try {
    const { data: ref } = await octokit.git.getRef({ owner: OWNER, repo: REPO, ref: `heads/${BRANCH}` });
    baseSha = ref.object.sha;
    console.log(`Existing branch '${BRANCH}' found at ${baseSha.slice(0,7)}`);
  } catch (e) {
    if (e.status === 404 || e.status === 409) {
      console.log('Repository is empty or branch not found. Will create initial commit.');
      baseSha = null;
    } else throw e;
  }

  console.log('Creating blobs...');
  const treeItems = [];
  for (const filePath of allFiles) {
    const rel = relative(ROOT, filePath);
    const content = readFileSync(filePath);
    const binary = isBinary(content);

    try {
      const { data: blob } = await octokit.git.createBlob({
        owner: OWNER, repo: REPO,
        content: content.toString(binary ? 'base64' : 'utf-8'),
        encoding: binary ? 'base64' : 'utf-8',
      });

      treeItems.push({
        path: rel,
        mode: '100644',
        type: 'blob',
        sha: blob.sha,
      });
      process.stdout.write('.');
    } catch (err) {
      console.error(`\nFailed to create blob for ${rel}: ${err.message}`);
    }
  }
  console.log(`\nCreated ${treeItems.length} blobs`);

  console.log('Creating tree...');
  const treeParams = { owner: OWNER, repo: REPO, tree: treeItems };
  if (baseSha) {
    const { data: baseCommit } = await octokit.git.getCommit({ owner: OWNER, repo: REPO, commit_sha: baseSha });
    treeParams.base_tree = baseCommit.tree.sha;
  }
  const { data: tree } = await octokit.git.createTree(treeParams);

  console.log('Creating commit...');
  const commitParams = {
    owner: OWNER, repo: REPO,
    message: 'Push all updates: PocketBase migration fix, Docker setup, documentation',
    tree: tree.sha,
  };
  if (baseSha) commitParams.parents = [baseSha];
  const { data: commit } = await octokit.git.createCommit(commitParams);

  console.log('Updating branch reference...');
  try {
    await octokit.git.updateRef({
      owner: OWNER, repo: REPO,
      ref: `heads/${BRANCH}`,
      sha: commit.sha,
      force: true,
    });
  } catch {
    await octokit.git.createRef({
      owner: OWNER, repo: REPO,
      ref: `refs/heads/${BRANCH}`,
      sha: commit.sha,
    });
  }

  console.log(`\nSuccessfully pushed to https://github.com/${OWNER}/${REPO}/tree/${BRANCH}`);
  console.log(`Commit: ${commit.sha.slice(0,7)} - ${commit.message}`);
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
