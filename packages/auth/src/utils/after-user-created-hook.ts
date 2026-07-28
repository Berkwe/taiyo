import { db } from "@taiyomoe/db"
import { getUserIndexItem, meilisearchClient } from "@taiyomoe/meilisearch"
import { env } from "../env"

export const provisionUserAfterCommit = async (id: string) => {
  const user = await db.user.findUniqueOrThrow({
    where: { id },
    select: { email: true },
  })

  await db.$transaction([
    db.userProfile.upsert({
      where: { userId: id },
      create: { userId: id },
      update: {},
    }),
    db.userLibrary.upsert({
      where: { userId: id },
      create: { userId: id },
      update: {},
    }),
    ...(env.BOOTSTRAP_ADMIN_EMAIL &&
    user.email?.toLocaleLowerCase("en") ===
      env.BOOTSTRAP_ADMIN_EMAIL.toLocaleLowerCase("en")
      ? [db.user.update({ where: { id }, data: { role: "ADMIN" } })]
      : []),
  ])

  const userIndexItem = await getUserIndexItem(db, id)

  await meilisearchClient.users.addDocuments([userIndexItem])
  // await logsClient.users.auth.insert({
  //   type: "registered",
  //   userId: id,
  // })
}
