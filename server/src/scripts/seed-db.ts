import { prisma, connectDatabase, disconnectDatabase } from "../config/database";

const SEED_MOVIE_IDS = [550, 680, 272]; // Fight Club, Pulp Fiction, Batman Begins

async function seedDatabase() {
  console.log("=========================================");
  console.log("🌱 Seeding Development PostgreSQL Database");
  console.log("=========================================");

  try {
    await connectDatabase();

    console.log(`\nInserting sample wishlist movie IDs: ${SEED_MOVIE_IDS.join(", ")}...`);

    for (const movieId of SEED_MOVIE_IDS) {
      const entry = await prisma.wishlist.upsert({
        where: { movieId },
        update: {},
        create: { movieId },
      });
      console.log(`✔ Seeded wishlist entry: ID ${entry.id} (TMDB Movie ID: ${entry.movieId})`);
    }

    const total = await prisma.wishlist.count();
    console.log(`\n🎉 Seeding complete! Total wishlist items in database: ${total}`);
  } catch (error) {
    console.error("❌ Error during database seeding:", error);
  } finally {
    await disconnectDatabase();
    console.log("=========================================");
  }
}

seedDatabase();
