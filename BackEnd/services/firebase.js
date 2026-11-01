let app;

export async function getFirebaseApp() {
  if (!app) {
    const { getApps, initializeApp } = await import('firebase-admin/app');
    app = getApps()[0] || initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'farm-help-383f1',
    });
  }
  return app;
}

export async function getAuth() {
  const { getAuth: auth } = await import('firebase-admin/auth');
  return auth(await getFirebaseApp());
}

export async function getDatabase() {
  const { getFirestore } = await import('firebase-admin/firestore');
  return getFirestore(await getFirebaseApp());
}
