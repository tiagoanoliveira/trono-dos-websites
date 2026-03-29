let userSecurityColumnsEnsured = false;

export async function ensureUserSecurityColumns(db: D1Database) {
  if (userSecurityColumnsEnsured) return;

  const columns = await db.prepare('PRAGMA table_info(users)')
    .all<{ name: string }>()
    .then((r) => r.results.map((row) => row.name));

  if (!columns.includes('is_blocked')) {
    await db.prepare('ALTER TABLE users ADD COLUMN is_blocked INTEGER DEFAULT 0').run();
  }
  if (!columns.includes('email_verified')) {
    await db.prepare('ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0').run();
  }
  if (!columns.includes('email_verification_token')) {
    await db.prepare('ALTER TABLE users ADD COLUMN email_verification_token TEXT').run();
  }
  if (!columns.includes('email_verification_sent_at')) {
    await db.prepare('ALTER TABLE users ADD COLUMN email_verification_sent_at TEXT').run();
  }

  userSecurityColumnsEnsured = true;
}
