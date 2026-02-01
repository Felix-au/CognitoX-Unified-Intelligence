# CognitoX: Planned Future Changes

This document tracks upcoming features, architectural adjustments, and service migrations planned for subsequent releases of CognitoX.

---

## 1. Authentication Migration: Firebase Authentication
Currently, CognitoX uses an out-of-the-box standard **Credentials Provider** (Email + Password login) via NextAuth.js. When the project owner provides Firebase credentials, we will transition the authentication layer to **Firebase Auth**.

### Migration Steps:
1. **Dependency updates:**
   - Install `firebase` and `firebase-admin` packages: `npm install firebase firebase-admin`.
2. **Environment Variables:**
   - Add the following variables to `.env`:
     ```env
     NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
     NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-auth-domain"
     NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
     NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-storage-bucket"
     NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
     NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"
     FIREBASE_CLIENT_EMAIL="your-firebase-client-email"
     FIREBASE_PRIVATE_KEY="your-firebase-private-key"
     ```
3. **Firebase Client Setup:**
   - Create `src/lib/firebase.ts` to initialize the client-side Firebase application.
4. **Prisma Schema Adaptations:**
   - Ensure the `User` model matches Firebase's `uid` (mapping the `User.id` string field directly to the Firebase `uid` token).
5. **NextAuth Adapter / Session Callback Configuration:**
   - Replace the standard NextAuth `CredentialsProvider` handler in `src/app/api/auth/[...nextauth]/route.ts` with custom credential verification that takes the client's Firebase ID Token, verifies it using `firebase-admin` on the server, and retrieves/creates the user in the PostgreSQL database.
6. **Frontend UI Adaptation:**
   - Modify the login page (`src/app/page.tsx`) to trigger `signInWithEmailAndPassword` via the Firebase Client SDK, fetch the JWT token, and pass it to the NextAuth handler.

---

## 2. Remote Media Storage Migration: Cloud Storage
- Currently, generated images from the Pollinations.ai API are stored directly via their public hosted URLs, and uploaded files are parsed on the fly.
- For production, upload raw files and generated visual assets directly to **Firebase Storage** or **AWS S3** to ensure asset persistence, access speed, and safety from public link expiration.
