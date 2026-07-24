import { db } from "@taiyomoe/db"
import { getUserIndexItem, meilisearchClient } from "@taiyomoe/meilisearch"
import type { User } from "better-auth"
import { env } from "../env"

export const afterUserCreatedHook = async ({ email, id }: User) => {
  if (
    env.BOOTSTRAP_ADMIN_EMAIL &&
    email.toLocaleLowerCase("en") ===
      env.BOOTSTRAP_ADMIN_EMAIL.toLocaleLowerCase("en")
  ) {
    await db.user.update({ where: { id }, data: { role: "ADMIN" } })
  }
  const userIndexItem = await getUserIndexItem(db, id)

  await db.userProfile.create({ data: { userId: id } })
  await db.userLibrary.create({ data: { userId: id } })
  await meilisearchClient.users.addDocuments([userIndexItem])
  // await logsClient.users.auth.insert({
  //   type: "registered",
  //   userId: id,
  // })
}
