/**
 * Old unique indexes on telegramId treat missing fields as null and break
 * username-based shops / per-channel (esp. web) sessions. Safe to call on every boot.
 */
export async function dropLegacyAuthIndexes(db) {
  if (!db) return;

  const drop = async (collection, name) => {
    try {
      await db.collection(collection).dropIndex(name);
      console.log(`[db] dropped legacy index ${collection}.${name}`);
    } catch (err) {
      if (
        err?.code === 27 ||
        err?.codeName === "IndexNotFound" ||
        /index not found/i.test(String(err?.message || ""))
      ) {
        return;
      }
      console.warn(`[db] dropIndex ${collection}.${name}:`, err.message);
    }
  };

  await drop("shops", "telegramId_1");
  await drop("shops", "telegramId_1_isActive_1");
  await drop("shops", "telegramChatId_1");
  await drop("shops", "whatsappPhone_1");
  // Credentials moved to users — drop leftover shop credential indexes.
  await drop("shops", "username_1");
  await drop("shops", "channels.telegramChatId_1");
  await drop("shops", "channels.whatsappPhone_1");
  await drop("authsessions", "telegramId_1");
  await drop("authsessions", "telegramId_1_type_1");
}
