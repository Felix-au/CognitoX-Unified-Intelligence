import * as jose from "jose";

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "your-project-id";

const JWKS = jose.createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

export interface FirebaseUserPayload {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
}

/**
 * Decodes and cryptographically verifies the Firebase ID Token (JWT) sent by the client.
 * Does not require any private service account keys.
 */
export async function verifyFirebaseIdToken(token: string): Promise<FirebaseUserPayload> {
  try {
    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });

    if (!payload.sub) {
      throw new Error("Missing subject (UID) in token payload");
    }

    return {
      uid: payload.sub,
      email: payload.email as string | undefined,
      name: payload.name as string | undefined,
      picture: payload.picture as string | undefined,
      email_verified: payload.email_verified as boolean | undefined,
    };
  } catch (error) {
    console.error("Firebase ID Token verification failed:", error);
    throw new Error("Authentication failed: Invalid token signature or claims.");
  }
}
