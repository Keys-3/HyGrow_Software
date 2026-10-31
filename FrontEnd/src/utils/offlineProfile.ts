import type { User } from '../store/slices/authSlice';

// A display profile is never a substitute for a Firebase-authenticated identity.
// Offline fallback is limited to farmers; it cannot restore administrator access.
export function offlineFarmer(value: unknown, uid: string, email: string | null): User | null {
  if (!value || typeof value !== 'object' || !email) return null;
  const user = value as Partial<User>;
  if (user.id !== uid || user.email !== email || user.role !== 'farmer' || typeof user.name !== 'string') return null;
  return { id: uid, email, name: user.name, role: 'farmer' };
}

export function isOfflineFailure(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  return ['unavailable', 'auth/network-request-failed', 'profile/offline-timeout'].includes(code || '');
}

export async function profileDeadline<T>(request: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([request, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error('Profile connection timed out.'), { code: 'profile/offline-timeout' })), 4000);
    })]);
  } finally { clearTimeout(timer); }
}
