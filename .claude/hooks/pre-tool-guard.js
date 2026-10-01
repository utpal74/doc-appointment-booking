#!/usr/bin/env node
/**
 * PreToolUse hook for the SDLC agents.
 *
 * Blocks (exit 2) tool calls that would:
 *   - stage changes indiscriminately (git add . / -A / --all, git commit -a)
 *   - rewrite remote history (git push --force / -f / +refspec)
 *   - discard work (git reset --hard, git clean -f, git checkout|restore .)
 *   - write to secret files (.env*, *.pem, *.key, ...) via Write/Edit or a shell
 *
 * Reads the hook payload as JSON on stdin. Messages on stderr are fed back to
 * the agent; they never echo the command text, which could contain secrets.
 */

const path = require('path');

const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);
const FILE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);
const SAFE_ENV_SUFFIX = /\.(example|sample|template|dist)$/i;
const SHELL_WRITE_COMMANDS = new Set([
  'cp', 'mv', 'tee', 'touch', 'dd', 'install', 'ln', 'truncate', 'sed', 'rm',
  'copy', 'move', 'del', 'erase', 'ren', 'rename',
  'copy-item', 'move-item', 'set-content', 'add-content', 'out-file',
  'new-item', 'remove-item', 'rename-item', 'clear-content',
]);

function isSecretPath(raw) {
  if (!raw) return false;
  const base = path.basename(String(raw).replace(/\\/g, '/')).toLowerCase();
  if (/^\.env(\..+)?$/.test(base)) return !SAFE_ENV_SUFFIX.test(base);
  if (/\.(pem|key|p12|pfx)$/.test(base)) return true;
  return /^id_(rsa|ed25519|ecdsa|dsa)$/.test(base);
}

// Splits a shell command into words, redirects, and separators, honouring quotes.
function tokenize(command) {
  const tokens = [];
  let word = '';
  let quote = null;
  let inWord = false;
  const flush = () => {
    if (inWord) tokens.push({ type: 'word', value: word });
    word = '';
    inWord = false;
  };

  for (let i = 0; i < command.length; i += 1) {
    const ch = command[i];
    if (quote) {
      if (ch === quote) quote = null;
      else word += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      inWord = true;
      continue;
    }
    if (ch === ' ' || ch === '\t' || ch === '\r') {
      flush();
      continue;
    }
    if (ch === '>') {
      // Drop a file-descriptor prefix such as 2> or *>.
      if (/^[0-9*]$/.test(word)) { word = ''; inWord = false; }
      flush();
      if (command[i + 1] === '>') i += 1;
      tokens.push({ type: 'redirect' });
      continue;
    }
    if (ch === ';' || ch === '|' || ch === '&' || ch === '\n') {
      flush();
      tokens.push({ type: 'separator' });
      continue;
    }
    word += ch;
    inWord = true;
  }
  flush();
  return tokens;
}

function splitSegments(tokens) {
  const segments = [[]];
  for (const token of tokens) {
    if (token.type === 'separator') segments.push([]);
    else segments[segments.length - 1].push(token);
  }
  return segments.filter((s) => s.length > 0);
}

function gitInvocation(words) {
  if (!words.length || !/^git(\.exe)?$/i.test(path.basename(words[0].replace(/\\/g, '/')))) return null;
  let i = 1;
  while (i < words.length && words[i].startsWith('-')) {
    i += ['-C', '-c', '--git-dir', '--work-tree'].includes(words[i]) ? 2 : 1;
  }
  if (i >= words.length) return null;
  return { sub: words[i], args: words.slice(i + 1) };
}

const hasShortFlag = (args, letter) =>
  args.some((a) => /^-[a-zA-Z]+$/.test(a) && a.includes(letter));
const isWholeTree = (a) => ['.', './', '*', ':/', ':/*', ':'].includes(a);

function checkGit(words) {
  const git = gitInvocation(words);
  if (!git) return null;
  const { sub, args } = git;

  if (sub === 'add' && (args.some(isWholeTree) || args.includes('--all') || hasShortFlag(args, 'A'))) {
    return 'Broad staging (git add . / -A / --all) is not allowed. Stage only the explicit, reviewed files that belong to the current task.';
  }
  if (sub === 'commit' && (args.includes('--all') || hasShortFlag(args, 'a'))) {
    return 'git commit -a / --all stages every tracked change. Stage the task files explicitly with git add <file>, then commit.';
  }
  if (sub === 'push' && (args.some((a) => a.startsWith('--force') || a.startsWith('+')) || hasShortFlag(args, 'f'))) {
    return 'Force pushes are not allowed from SDLC agents. Push normally; if history must be rewritten, surface it to the user.';
  }
  if (sub === 'reset' && args.includes('--hard')) {
    return 'git reset --hard discards working-tree changes and is not allowed. Preserve unrelated changes and surface the blocker instead.';
  }
  if (sub === 'clean' && (args.includes('--force') || hasShortFlag(args, 'f'))) {
    return 'git clean -f deletes untracked files and is not allowed. Remove only specific files that belong to the current task.';
  }
  const stagedOnly = sub === 'restore' && args.includes('--staged') && !args.includes('--worktree');
  if ((sub === 'checkout' || sub === 'restore') && args.some(isWholeTree) && !stagedOnly) {
    return `git ${sub} on the whole tree discards working-tree changes and is not allowed. Restore specific files only, and only ones you changed.`;
  }
  return null;
}

function writesSecretFile(segment) {
  for (let i = 0; i < segment.length - 1; i += 1) {
    if (segment[i].type === 'redirect' && isSecretPath(segment[i + 1].value)) return true;
  }
  const words = segment.filter((t) => t.type === 'word').map((t) => t.value);
  if (!words.length) return false;
  const cmd = path.basename(words[0].replace(/\\/g, '/')).toLowerCase().replace(/\.exe$/, '');
  return SHELL_WRITE_COMMANDS.has(cmd) && words.slice(1).some(isSecretPath);
}

function evaluate(payload) {
  const tool = payload.tool_name;
  const input = payload.tool_input || {};

  if (FILE_TOOLS.has(tool)) {
    if (isSecretPath(input.file_path || input.notebook_path)) {
      return 'Writing to secret/credential files (.env, keys, certificates) is not allowed. Document required variables in .env.example instead.';
    }
    return null;
  }

  if (SHELL_TOOLS.has(tool) && typeof input.command === 'string') {
    for (const segment of splitSegments(tokenize(input.command))) {
      const words = segment.filter((t) => t.type === 'word').map((t) => t.value);
      const gitReason = checkGit(words);
      if (gitReason) return gitReason;
      if (writesSecretFile(segment)) {
        return 'Shell writes to secret/credential files (.env, keys, certificates) are not allowed. Document required variables in .env.example instead.';
      }
    }
  }
  return null;
}

function main() {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { raw += chunk; });
  process.stdin.on('end', () => {
    let payload;
    try {
      payload = JSON.parse(raw || '{}');
    } catch {
      process.stderr.write('pre-tool-guard: could not parse hook input; skipping checks.\n');
      process.exit(1);
    }
    const reason = evaluate(payload);
    if (reason) {
      const agent = payload.agent_type ? ` (${payload.agent_type})` : '';
      process.stderr.write(`[pre-tool-guard${agent}] Blocked ${payload.tool_name}: ${reason}\n`);
      process.exit(2);
    }
    process.exit(0);
  });
}

if (require.main === module) main();

module.exports = { evaluate, isSecretPath, tokenize };
