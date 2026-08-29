import autocannon from "autocannon";

import {
  createClient,
} from "@supabase/supabase-js";

const baseUrl =
  process.env.LOAD_TEST_BASE_URL ??
  "http://localhost:3000";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

const email =
  process.env.LOAD_TEST_EMAIL ??
  "";

const password =
  process.env.LOAD_TEST_PASSWORD ??
  "";

const connections =
  Number(
    process.env.LOAD_TEST_CONNECTIONS ??
      2
  );

const duration =
  Number(
    process.env.LOAD_TEST_DURATION ??
      15
  );

const url =
  `${baseUrl}/api/intelligence-summary`;

const thresholds = {
  averageLatencyMs:
    3000,

  p97_5LatencyMs:
    6000,
};

if (
  !supabaseUrl.trim() ||
  !supabaseKey.trim()
) {
  console.error(
    "Supabase environment variables are required."
  );

  process.exit(1);
}

if (
  !email.trim() ||
  !password
) {
  console.error(
    "LOAD_TEST_EMAIL and LOAD_TEST_PASSWORD are required."
  );

  process.exit(1);
}

const supabase =
  createClient(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        persistSession:
          false,

        autoRefreshToken:
          false,
      },
    }
  );

const {
  data:
    authentication,
  error:
    authenticationError,
} =
  await supabase.auth
    .signInWithPassword({
      email:
        email.trim(),

      password,
    });

if (
  authenticationError ||
  !authentication.session
    ?.access_token
) {
  console.error(
    "Could not authenticate the load-test user."
  );

  process.exit(1);
}

const token =
  authentication
    .session
    .access_token;

console.log(
  "Load-test user authenticated successfully."
);

console.log(
  `Running authenticated intelligence load test: ${url}`
);

console.log(
  `Connections: ${connections}, duration: ${duration}s`
);

const statusCounts =
  new Map();

const result =
  await autocannon({
    url,

    method:
      "POST",

    connections,

    duration,

    pipelining:
      1,

    setupClient:
      (client) => {
        client.on(
          "response",
          (
            statusCode
          ) => {
            statusCounts.set(
              statusCode,
              (
                statusCounts.get(
                  statusCode
                ) ?? 0
              ) + 1
            );
          }
        );
      },

    headers: {
      authorization:
        `Bearer ${token}`,

      "content-type":
        "application/json",
    },

    body:
      JSON.stringify({
        language:
          "en",
      }),
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

const requests =
  result.requests.total;

const throughput =
  duration > 0
    ? requests / duration
    : 0;

const statusSummary =
  Object.fromEntries(
    [...statusCounts.entries()]
      .sort(
        (
          [left],
          [right]
        ) =>
          Number(left) -
          Number(right)
      )
  );

console.log("");
console.log(
  "=== AUTHENTICATED INTELLIGENCE LOAD TEST RESULT ==="
);

console.log(
  `Requests: ${requests}`
);

console.log(
  `Approx. throughput: ${throughput.toFixed(2)} req/s`
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

console.log(
  "HTTP status counts:",
  statusSummary
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

  for (
    const failure of
    failures
  ) {
    console.error(
      `- ${failure}`
    );
  }

  process.exitCode =
    1;
} else {
  console.log("");
  console.log(
    "LOAD TEST PASSED"
  );
}