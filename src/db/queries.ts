import { eq, desc, and } from 'drizzle-orm';
import { db } from './index.ts';
import { users, sqlTaskLogs } from './schema.ts';

export async function getOrCreateUser(uid: string, email: string) {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (existing.length > 0) {
      return existing[0];
    }

    const [newUser] = await db
      .insert(users)
      .values({ uid, email })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email },
      })
      .returning();

    return newUser;
  } catch (error) {
    console.error('Database Error in getOrCreateUser:', error);
    throw new Error('Failed to synchronize user profile.');
  }
}

export async function listUserSqlLogs(uid: string) {
  try {
    return await db
      .select()
      .from(sqlTaskLogs)
      .where(eq(sqlTaskLogs.userUid, uid))
      .orderBy(desc(sqlTaskLogs.createdAt))
      .limit(50);
  } catch (error) {
    console.error('Database Error in listUserSqlLogs:', error);
    throw new Error('Failed to load records.');
  }
}

export async function createUserSqlLog(
  uid: string,
  title: string,
  category: string,
  modality: string,
  summary: string
) {
  try {
    const [inserted] = await db
      .insert(sqlTaskLogs)
      .values({
        userUid: uid,
        title: title.slice(0, 200),
        category: category.slice(0, 80),
        modality: modality.slice(0, 80),
        summary: summary.slice(0, 4000),
      })
      .returning();
    return inserted;
  } catch (error) {
    console.error('Database Error in createUserSqlLog:', error);
    throw new Error('Failed to create record.');
  }
}

export async function deleteUserSqlLog(uid: string, id: number) {
  try {
    await db
      .delete(sqlTaskLogs)
      .where(and(eq(sqlTaskLogs.id, id), eq(sqlTaskLogs.userUid, uid)));
    return { deleted: true };
  } catch (error) {
    console.error('Database Error in deleteUserSqlLog:', error);
    throw new Error('Failed to delete record.');
  }
}
