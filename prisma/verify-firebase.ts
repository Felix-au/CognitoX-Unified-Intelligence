import { verifyFirebaseIdToken } from "../src/lib/firebase-verify";

console.log("Firebase server verification utility compiled successfully!");
console.log("Exported functions:", typeof verifyFirebaseIdToken === 'function' ? "verifyFirebaseIdToken OK" : "FAILED");
