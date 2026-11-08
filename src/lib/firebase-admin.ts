import fs from 'fs';
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const rawConfig = fs.readFileSync(
  new URL('../../firebase-applet-config.json', import.meta.url),
  'utf8'
);
const firebaseConfig = JSON.parse(rawConfig) as { projectId: string };

const adminApp =
  getApps().length === 0
    ? initializeApp({ projectId: firebaseConfig.projectId })
    : getApp();

export const adminAuth = getAuth(adminApp);

