async function main() {
  process.env.PRISMA_SEED = "1"
  const [{ db }, { seedPlatform }] = await Promise.all([
    import(".."),
    import("./seeds/platform"),
  ])
  await seedPlatform()
  await db.$disconnect()
  console.log("NovoraScans fictional platform seed completed.")
}

main()
