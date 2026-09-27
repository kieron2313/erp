import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

let projectId = 'gen-lang-client-0847909011';
try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed.projectId) projectId = parsed.projectId;
  }
} catch (e) {
  console.warn('Could not read firebase-applet-config.json:', e);
}

if (!getApps().length) {
  initializeApp({
    projectId,
  });
}

export const adminAuth = getAuth();
