#!/usr/bin/env node
/**
 * Load Testing Script for 100X Traffic Validation
 *
 * This script simulates high traffic load to validate the provisioning
 * can handle 100X the normal traffic levels.
 *
 * Usage:
 *   node loadtest.js [options]
 *
 * Options:
 *   --url           Target URL (default: http://localhost:3000)
 *   --duration      Test duration in seconds (default: 60)
 *   --concurrency   Number of concurrent connections (default: 100)
 *   --rps           Target requests per second (default: 1000)
 */

const http = require("http");
const https = require("https");

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name, defaultValue) => {
  const index = args.indexOf(`--${name}`);
  return index !== -1 ? args[index + 1] : defaultValue;
};

const TARGET_URL = getArg("url", "http://localhost:3000");
const DURATION_SECONDS = parseInt(getArg("duration", "60"), 10);
const CONCURRENCY = parseInt(getArg("concurrency", "100"), 10);
const TARGET_RPS = parseInt(getArg("rps", "1000"), 10);

// Metrics tracking
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalLatency: 0,
  minLatency: Infinity,
  maxLatency: 0,
  latencies: [],
  statusCodes: {},
  errors: {}
};

const parsedUrl = new URL(TARGET_URL);
const httpModule = parsedUrl.protocol === "https:" ? https : http;

function makeRequest() {
  return new Promise((resolve) => {
    const startTime = process.hrtime.bigint();

    const req = httpModule.get(TARGET_URL, {
      headers: {
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive"
      },
      timeout: 30000
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        const endTime = process.hrtime.bigint();
        const latencyMs = Number(endTime - startTime) / 1_000_000;

        metrics.totalRequests++;
        metrics.totalLatency += latencyMs;
        metrics.latencies.push(latencyMs);
        metrics.minLatency = Math.min(metrics.minLatency, latencyMs);
        metrics.maxLatency = Math.max(metrics.maxLatency, latencyMs);

        const statusCode = res.statusCode.toString();
        metrics.statusCodes[statusCode] = (metrics.statusCodes[statusCode] || 0) + 1;

        if (res.statusCode >= 200 && res.statusCode < 400) {
          metrics.successfulRequests++;
        } else {
          metrics.failedRequests++;
        }

        resolve();
      });
    });

    req.on("error", (err) => {
      metrics.totalRequests++;
      metrics.failedRequests++;
      const errorType = err.code || err.message;
      metrics.errors[errorType] = (metrics.errors[errorType] || 0) + 1;
      resolve();
    });

    req.on("timeout", () => {
      req.destroy();
      metrics.totalRequests++;
      metrics.failedRequests++;
      metrics.errors["TIMEOUT"] = (metrics.errors["TIMEOUT"] || 0) + 1;
      resolve();
    });
  });
}

function calculatePercentile(sortedArray, percentile) {
  if (sortedArray.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
  return sortedArray[Math.max(0, index)];
}

async function runLoadTest() {
  console.log("=".repeat(60));
  console.log("LOAD TEST - 100X TRAFFIC VALIDATION");
  console.log("=".repeat(60));
  console.log(`Target URL:        ${TARGET_URL}`);
  console.log(`Duration:          ${DURATION_SECONDS} seconds`);
  console.log(`Concurrency:       ${CONCURRENCY} connections`);
  console.log(`Target RPS:        ${TARGET_RPS} requests/second`);
  console.log("=".repeat(60));
  console.log("\nStarting load test...\n");

  const startTime = Date.now();
  const endTime = startTime + (DURATION_SECONDS * 1000);
  const delayBetweenRequests = 1000 / (TARGET_RPS / CONCURRENCY);

  let running = true;

  // Progress reporter
  const progressInterval = setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000;
    const currentRps = metrics.totalRequests / elapsed;
    const successRate = metrics.totalRequests > 0
      ? ((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1)
      : "0.0";
    process.stdout.write(`\rProgress: ${elapsed.toFixed(0)}s | Requests: ${metrics.totalRequests} | RPS: ${currentRps.toFixed(0)} | Success: ${successRate}%`);
  }, 1000);

  // Worker function
  async function worker() {
    while (running && Date.now() < endTime) {
      await makeRequest();
      if (delayBetweenRequests > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
      }
    }
  }

  // Start concurrent workers
  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(worker());
  }

  // Wait for test completion
  await Promise.all(workers);
  running = false;
  clearInterval(progressInterval);

  // Calculate final statistics
  const totalDuration = (Date.now() - startTime) / 1000;
  const avgLatency = metrics.totalRequests > 0
    ? metrics.totalLatency / metrics.totalRequests
    : 0;

  metrics.latencies.sort((a, b) => a - b);
  const p50 = calculatePercentile(metrics.latencies, 50);
  const p95 = calculatePercentile(metrics.latencies, 95);
  const p99 = calculatePercentile(metrics.latencies, 99);

  // Print results
  console.log("\n\n" + "=".repeat(60));
  console.log("LOAD TEST RESULTS");
  console.log("=".repeat(60));

  console.log("\n--- SUMMARY ---");
  console.log(`Total Duration:      ${totalDuration.toFixed(2)} seconds`);
  console.log(`Total Requests:      ${metrics.totalRequests}`);
  console.log(`Successful:          ${metrics.successfulRequests}`);
  console.log(`Failed:              ${metrics.failedRequests}`);
  console.log(`Success Rate:        ${((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2)}%`);
  console.log(`Requests/Second:     ${(metrics.totalRequests / totalDuration).toFixed(2)}`);

  console.log("\n--- LATENCY (ms) ---");
  console.log(`Min:                 ${metrics.minLatency.toFixed(2)}`);
  console.log(`Max:                 ${metrics.maxLatency.toFixed(2)}`);
  console.log(`Average:             ${avgLatency.toFixed(2)}`);
  console.log(`P50 (Median):        ${p50.toFixed(2)}`);
  console.log(`P95:                 ${p95.toFixed(2)}`);
  console.log(`P99:                 ${p99.toFixed(2)}`);

  console.log("\n--- STATUS CODES ---");
  for (const [code, count] of Object.entries(metrics.statusCodes)) {
    console.log(`${code}:                  ${count}`);
  }

  if (Object.keys(metrics.errors).length > 0) {
    console.log("\n--- ERRORS ---");
    for (const [error, count] of Object.entries(metrics.errors)) {
      console.log(`${error}:              ${count}`);
    }
  }

  console.log("\n" + "=".repeat(60));

  // Validation checks for 100X traffic readiness
  console.log("\n--- 100X TRAFFIC VALIDATION ---");
  const checks = [];

  // Check 1: Success rate > 99%
  const successRate = (metrics.successfulRequests / metrics.totalRequests) * 100;
  checks.push({
    name: "Success Rate > 99%",
    passed: successRate > 99,
    value: `${successRate.toFixed(2)}%`
  });

  // Check 2: P95 latency < 500ms
  checks.push({
    name: "P95 Latency < 500ms",
    passed: p95 < 500,
    value: `${p95.toFixed(2)}ms`
  });

  // Check 3: P99 latency < 1000ms
  checks.push({
    name: "P99 Latency < 1000ms",
    passed: p99 < 1000,
    value: `${p99.toFixed(2)}ms`
  });

  // Check 4: No connection errors
  const connectionErrors = (metrics.errors["ECONNREFUSED"] || 0) +
                          (metrics.errors["ECONNRESET"] || 0) +
                          (metrics.errors["TIMEOUT"] || 0);
  checks.push({
    name: "No Connection Errors",
    passed: connectionErrors === 0,
    value: `${connectionErrors} errors`
  });

  let allPassed = true;
  for (const check of checks) {
    const status = check.passed ? "PASS" : "FAIL";
    const symbol = check.passed ? "✓" : "✗";
    console.log(`${symbol} ${check.name}: ${check.value} [${status}]`);
    if (!check.passed) allPassed = false;
  }

  console.log("\n" + "=".repeat(60));
  if (allPassed) {
    console.log("RESULT: READY FOR 100X TRAFFIC");
  } else {
    console.log("RESULT: NOT READY - ADDRESS FAILED CHECKS");
  }
  console.log("=".repeat(60));

  process.exit(allPassed ? 0 : 1);
}

runLoadTest().catch(err => {
  console.error("Load test error:", err);
  process.exit(1);
});
