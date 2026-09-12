import { tmdbService } from "../services/tmdb.service";
import { env } from "../config/env";
import { TmdbError } from "../utils/tmdb-error";

async function runTmdbTest() {
  console.log("=========================================");
  console.log("🎬 TMDB Service Integration Test");
  console.log("=========================================");
  console.log(`Base URL: ${env.tmdb.baseUrl}`);
  console.log(`Image Base URL: ${env.tmdb.imageBaseUrl}`);
  console.log(`Timeout: ${env.tmdb.timeoutMs}ms`);
  console.log(
    `Auth method configured: ${
      env.tmdb.accessToken ? "v4 Read Access Token (Bearer)" : env.tmdb.apiKey ? "v3 API Key" : "NONE (Missing credentials)"
    }`
  );
  console.log("-----------------------------------------");

  if (!env.tmdb.accessToken && !env.tmdb.apiKey) {
    console.warn("⚠️ No TMDB credentials found in .env!");
    console.warn("Please add either TMDB_ACCESS_TOKEN or TMDB_API_KEY in server/.env to test live requests.");
    console.warn("Get your free API key at: https://www.themoviedb.org/settings/api");
    return;
  }

  try {
    // Test 1: Fetch Popular Movies
    console.log("\n[Test 1] Fetching popular movies (page 1)...");
    const popularData = await tmdbService.getPopularMovies(1);
    console.log(`✅ Success! Page: ${popularData.page}, Total Results: ${popularData.total_results}, Movies returned: ${popularData.results.length}`);

    const firstMovie = popularData.results[0];
    if (firstMovie) {
      console.log(`Sample movie: "${firstMovie.title}" (ID: ${firstMovie.id}, Rating: ${firstMovie.vote_average})`);
      console.log(`Poster image URL: ${tmdbService.buildImageUrl(firstMovie.poster_path, "w500")}`);
      console.log(`Backdrop image URL: ${tmdbService.buildImageUrl(firstMovie.backdrop_path, "w780")}`);

      // Test 2: Fetch Movie Details
      console.log(`\n[Test 2] Fetching movie details for ID ${firstMovie.id} ("${firstMovie.title}")...`);
      const details = await tmdbService.getMovieDetails(firstMovie.id);
      console.log(`✅ Details retrieved successfully!`);
      console.log(`- Tagline: "${details.tagline || "N/A"}"`);
      console.log(`- Runtime: ${details.runtime} mins`);
      console.log(`- Status: ${details.status}`);
      console.log(`- Genres: ${details.genres.map((g) => g.name).join(", ")}`);
    }

    // Test 3: Error Handling with invalid movie ID
    console.log("\n[Test 3] Testing error handling with non-existent movie ID (999999999)...");
    try {
      await tmdbService.getMovieDetails(999999999);
      console.error("❌ Test failed: Expected error was not thrown.");
    } catch (err) {
      if (err instanceof TmdbError) {
        console.log(`✅ Handled expected TmdbError cleanly! Code: ${err.code}, Status: ${err.statusCode}, Message: ${err.message}`);
      } else {
        console.error("❌ Unexpected error type thrown:", err);
      }
    }

    console.log("\n=========================================");
    console.log("🎉 All TMDB integration tests passed!");
    console.log("=========================================");
  } catch (error) {
    if (error instanceof TmdbError) {
      console.error(`\n❌ TMDB Error [${error.code}] (Status ${error.statusCode}):`, error.message);
      if (error.details) {
        console.error("Details:", error.details);
      }
    } else {
      console.error("\n❌ Unexpected Error:", error);
    }
  }
}

runTmdbTest();
