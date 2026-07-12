import * as dotenv from 'dotenv';
dotenv.config();

import { adminDb } from './src/config/firebase';

async function test() {
  try {
    const db = adminDb();
    console.log('Testing listCollections...');
    await db.listCollections();
    console.log('Success');
  } catch (e) {
    console.error('ERROR:', e);
  }
}
test();
