import fs from 'fs';

const content = [
    "VITE_FIREBASE_API_KEY=AIzaSyALYGNZXwBhBT45GIqfHP9XX7chySu2378",
    "VITE_FIREBASE_AUTH_DOMAIN=flowread-v007.firebaseapp.com",
    "VITE_FIREBASE_PROJECT_ID=flowread-v007",
    "VITE_FIREBASE_STORAGE_BUCKET=flowread-v007.firebasestorage.app",
    "VITE_FIREBASE_MESSAGING_SENDER_ID=452465146248",
    "VITE_FIREBASE_APP_ID=1:452465146248:web:db5c68001c7edb5cb3223d",
    "VITE_FIREBASE_MEASUREMENT_ID=G-7TGVCKC2Q0",
    "",
    "# AI Provider Configuration",
    "AI_PROVIDER=gemini",
    "VITE_AI_PROVIDER=gemini",
    "",
    "# Dedicated Gemini API Key (User provided)",
    "VITE_GOOGLE_API_KEY=AIzaSyAUd7sqLO7vQTF9DW1AqdpCZNZ5t6io_tY"
].join("\n");

try {
    fs.writeFileSync('.env.local', content);
    console.log('Successfully wrote .env.local');
} catch (err) {
    console.error('Failed to write .env.local', err);
    process.exit(1);
}
