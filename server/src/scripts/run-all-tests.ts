import { runUnitTests } from "./test-unit";
import { runProviderTests } from "./test-providers";
import { runServiceTests } from "./test-services";
import { runApiIntegrationTests } from "./test-api-integration";
import { runDatabaseIntegrationTests } from "./test-db-integration";
import { runSecurityTests } from "./test-security";

interface SuiteResult {
  layer: string;
  name: string;
  passed: number;
  failed: number;
  durationMs: number;
}

async function runAllBackendTests() {
  const startTime = Date.now();
  console.log("=================================================");
  console.log("🎬 Movie Discovery App — Full Backend Test Suite");
  console.log("=================================================");

  const results: SuiteResult[] = [];

  const executeSuite = async (
    layer: string,
    name: string,
    fn: () => Promise<{ passed: number; failed: number }>
  ) => {
    const suiteStart = Date.now();
    try {
      const res = await fn();
      results.push({
        layer,
        name,
        passed: res.passed,
        failed: res.failed,
        durationMs: Date.now() - suiteStart,
      });
    } catch (error) {
      console.error(`💥 Suite ${layer} encountered fatal error:`, error);
      results.push({
        layer,
        name,
        passed: 0,
        failed: 1,
        durationMs: Date.now() - suiteStart,
      });
    }
  };

  // Run all 6 testing layers sequentially
  await executeSuite("Layer 1", "Pure Unit Tests (Utilities & Validators)", runUnitTests);
  await executeSuite("Layer 2", "Movie Provider Contract & Failure Tests", runProviderTests);
  await executeSuite("Layer 3", "Service & Business Logic Tests", runServiceTests);
  await executeSuite("Layer 4", "Express HTTP API Integration Tests", runApiIntegrationTests);
  await executeSuite("Layer 5", "PostgreSQL Database Integration Tests", runDatabaseIntegrationTests);
  await executeSuite("Layer 6", "Security & Production Readiness Tests", runSecurityTests);

  const totalDurationMs = Date.now() - startTime;
  const totalPassed = results.reduce((acc, r) => acc + r.passed, 0);
  const totalFailed = results.reduce((acc, r) => acc + r.failed, 0);
  const totalTests = totalPassed + totalFailed;

  console.log("\n=================================================");
  console.log("📊 Final Backend Test Execution Summary");
  console.log("=================================================");
  console.log(
    `| ${"Layer".padEnd(8)} | ${"Suite Name".padEnd(46)} | ${"Passed".padStart(6)} | ${"Failed".padStart(6)} | ${"Time (ms)".padStart(9)} |`
  );
  console.log(`|${"-".repeat(10)}|${"-".repeat(48)}|${"-".repeat(8)}|${"-".repeat(8)}|${"-".repeat(11)}|`);

  for (const r of results) {
    const statusIcon = r.failed === 0 ? "✅" : "❌";
    console.log(
      `| ${r.layer.padEnd(8)} | ${r.name.padEnd(46)} | ${(r.passed + " " + statusIcon).padStart(8)} | ${r.failed.toString().padStart(6)} | ${r.durationMs.toString().padStart(9)} |`
    );
  }

  console.log(`|${"-".repeat(10)}|${"-".repeat(48)}|${"-".repeat(8)}|${"-".repeat(8)}|${"-".repeat(11)}|`);
  console.log(
    `| Total    | ${`${results.length} Suites Executed`.padEnd(46)} | ${totalPassed.toString().padStart(6)} | ${totalFailed.toString().padStart(6)} | ${totalDurationMs.toString().padStart(9)} |`
  );
  console.log("=================================================");

  if (totalFailed === 0) {
    console.log(`\n🎉 All ${totalTests} backend tests passed successfully in ${(totalDurationMs / 1000).toFixed(2)}s!`);
    process.exit(0);
  } else {
    console.error(`\n❌ Test suite failed with ${totalFailed} failing assertions.`);
    process.exit(1);
  }
}

runAllBackendTests();
