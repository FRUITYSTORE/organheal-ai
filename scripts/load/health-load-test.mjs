import autocannon from "autocannon";

const url =
  process.env.LOAD_TEST_URL ??
  "http://localhost:3000/api/health";

const connections =
  Number(
    process.env.LOAD_TEST_CONNECTIONS ??
      10
  );

const duration =
  Number(
    process.env.LOAD_TEST_DURATION ??
      15
  );

const thresholds = {
  averageLatencyMs: 1500,
  p97_5LatencyMs: 4000,
};

console.log(
  `Running health load test: ${url}`
);

console.log(
  `Connections: ${connections}, duration: ${duration}s`
);

const result =
  await autocannon({
    url,
    connections,
    duration,
    pipelining: 1,
  });

const averageLatency =
  result.latency.average;

const p97_5Latency =
  result.latency.p97_5;

const errors =
  result.errors ?? 0;

const timeouts =
  result.timeouts ?? 0;

const non2xx =
  result.non2xx ?? 0;

console.log("");
console.log("=== HEALTH LOAD TEST RESULT ===");
console.log(
  `Requests: ${result.requests.total}`
);
console.log(
  `Average latency: ${averageLatency} ms`
);
console.log(
  `p97.5 latency: ${p97_5Latency} ms`
);
console.log(
  `Errors: ${errors}`
);
console.log(
  `Timeouts: ${timeouts}`
);
console.log(
  `Non-2xx: ${non2xx}`
);

const failures = [];

if (errors > 0) {
  failures.push(
    `errors=${errors}`
  );
}

if (timeouts > 0) {
  failures.push(
    `timeouts=${timeouts}`
  );
}

if (non2xx > 0) {
  failures.push(
    `non2xx=${non2xx}`
  );
}

if (
  averageLatency >
  thresholds.averageLatencyMs
) {
  failures.push(
    `average latency ${averageLatency} ms > ${thresholds.averageLatencyMs} ms`
  );
}

if (
  p97_5Latency >
  thresholds.p97_5LatencyMs
) {
  failures.push(
    `p97.5 latency ${p97_5Latency} ms > ${thresholds.p97_5LatencyMs} ms`
  );
}

if (failures.length > 0) {
  console.error("");
  console.error(
    "LOAD TEST FAILED"
  );

  for (const failure of failures) {
    console.error(
      `- ${failure}`
    );
  }

  process.exitCode = 1;
} else {
  console.log("");
  console.log(
    "LOAD TEST PASSED"
  );
}