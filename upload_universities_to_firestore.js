// Script to upload universities.json to Firestore
// Usage: node upload_universities_to_firestore.js


import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import admin from 'firebase-admin';
import { readFile } from 'fs/promises';

const universities = JSON.parse(
  await readFile(new URL('./universities.json', import.meta.url), 'utf8')
);

// TODO: Replace with your Firebase project config or use GOOGLE_APPLICATION_CREDENTIALS env var
admin.initializeApp({
  credential: applicationDefault(),
});

const db = getFirestore();

async function uploadUniversities() {
  for (const uni of universities) {
    const uniRef = db.collection('universities').doc();
    const { programs, ...uniData } = uni;
    await uniRef.set(uniData);
    if (programs && programs.length > 0) {
      for (const prog of programs) {
        await uniRef.collection('programs').add(prog);
      }
    }
    console.log(`Uploaded: ${uni.name}`);
  }
  console.log('All universities uploaded!');
}

uploadUniversities().catch(console.error);
