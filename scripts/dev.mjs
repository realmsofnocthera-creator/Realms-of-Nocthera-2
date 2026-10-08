#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';

const rawArgs = process.argv.slice(2);
const cleanArgs = [];

for (let i = 0; i < rawArgs.length; i++) {
  const arg = rawArgs[i];
  if (arg === '--host') {
    const nextArg = rawArgs[i + 1];
    if (nextArg && !nextArg.startsWith('-')) {
      if (nextArg === 'true' || nextArg === 'false') {
        cleanArgs.push('-H', '0.0.0.0');
      } else {
        cleanArgs.push('-H', nextArg);
      }
      i++;
    } else {
      cleanArgs.push('-H', '0.0.0.0');
    }
  } else if (arg.startsWith('--host=')) {
    const val = arg.slice(7);
    if (val === 'true' || val === 'false' || !val) {
      cleanArgs.push('-H', '0.0.0.0');
    } else {
      cleanArgs.push('-H', val);
    }
  } else {
    cleanArgs.push(arg);
  }
}

// Ensure -p 3000 is included if not specified
let hasPort = false;
for (let i = 0; i < cleanArgs.length; i++) {
  if (cleanArgs[i] === '-p' || cleanArgs[i] === '--port' || cleanArgs[i]?.startsWith?.('--port=')) {
    hasPort = true;
    break;
  }
}
if (!hasPort) {
  cleanArgs.push('-p', '3000');
}

const nextBin = path.resolve(process.cwd(), 'node_modules/next/dist/bin/next');

const childEnv = { ...process.env, PORT: '3000' };

const child = spawn(process.execPath, [nextBin, 'dev', ...cleanArgs], {
  stdio: 'inherit',
  env: childEnv,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});

process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
