import * as dotenv from 'dotenv';
dotenv.config();

console.log('Project ID:', JSON.stringify(process.env.FIREBASE_PROJECT_ID));
console.log('Length:', process.env.FIREBASE_PROJECT_ID?.length);
