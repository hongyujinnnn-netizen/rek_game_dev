import { SignJWT, jwtVerify } from 'jose';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlayerSession = {
  id: string;
  email: string | null;
  name: string;
  wins: number | null;
  losses: number | null;
  role: string;
};

// ─── Secret Key ───────────────────────────────────────────────────────────────

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set.');
  }
  return new TextEncoder().encode(secret);
}

// ─── Sign ─────────────────────────────────────────────────────────────────────

/**
 * Signs a JWT containing the player session payload.
 * Uses HS256 algorithm with a 7-day expiry.
 */
export async function signSessionToken(session: PlayerSession): Promise<string> {
  const secret = getJwtSecret();

  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

// ─── Verify ───────────────────────────────────────────────────────────────────

/**
 * Verifies a JWT and returns the decoded player session.
 * Returns null if verification fails (expired, tampered, etc.).
 */
export async function verifySessionToken(token: string): Promise<PlayerSession | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    });

    // Ensure required fields are present
    if (!payload.id || typeof payload.id !== 'string') {
      return null;
    }

    return {
      id: payload.id as string,
      email: (payload.email as string) ?? null,
      name: (payload.name as string) ?? 'Player',
      wins: typeof payload.wins === 'number' ? payload.wins : null,
      losses: typeof payload.losses === 'number' ? payload.losses : null,
      role: (payload.role as string) ?? 'player',
    };
  } catch {
    return null;
  }
}
