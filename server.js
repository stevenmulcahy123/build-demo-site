const http = require("http");
const cluster = require("cluster");
const os = require("os");
const zlib = require("zlib");

const port = process.env.PORT || 3000;
const numCPUs = os.cpus().length;

// Performance metrics tracking
const metrics = {
  requestCount: 0,
  totalResponseTime: 0,
  startTime: Date.now(),
  errors: 0
};

// Cluster mode for multi-core utilization
if (cluster.isPrimary) {
  console.log(`Primary process ${process.pid} starting...`);
  console.log(`Forking ${numCPUs} worker processes for high traffic handling`);

  // Fork workers for each CPU core
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Handle worker crashes - restart immediately
  cluster.on("exit", (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died (${signal || code}). Restarting...`);
    cluster.fork();
  });

  // Graceful shutdown handling
  process.on("SIGTERM", () => {
    console.log("SIGTERM received, shutting down gracefully...");
    for (const id in cluster.workers) {
      cluster.workers[id].kill("SIGTERM");
    }
    process.exit(0);
  });

} else {
  // Worker process - handle requests

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Build.io Node Demo App</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    /* Theme CSS Custom Properties */
    :root {
      /* Nighttime (dark) theme - default */
      --bg-primary: #0f172a;
      --bg-card: #020617;
      --text-primary: #e5e7eb;
      --text-secondary: #9ca3af;
      --text-muted: #6b7280;
      --border-color: #1e293b;
      --badge-bg: #0f766e;
      --badge-text: #ecfeff;
      --code-bg: #020617;
      --code-border: #1f2933;
      --shadow-color: rgba(15, 23, 42, 0.6);
      --success-color: #22c55e;
      --success-glow: rgba(34, 197, 94, 0.9);
      --toggle-bg: #1e293b;
      --toggle-hover: #334155;
    }

    /* Daytime (light) theme */
    [data-theme="day"] {
      --bg-primary: #f1f5f9;
      --bg-card: #ffffff;
      --text-primary: #1e293b;
      --text-secondary: #475569;
      --text-muted: #64748b;
      --border-color: #e2e8f0;
      --badge-bg: #14b8a6;
      --badge-text: #f0fdfa;
      --code-bg: #f8fafc;
      --code-border: #cbd5e1;
      --shadow-color: rgba(100, 116, 139, 0.2);
      --success-color: #10b981;
      --success-glow: rgba(16, 185, 129, 0.6);
      --toggle-bg: #e2e8f0;
      --toggle-hover: #cbd5e1;
    }

    /* Christmas theme - active on December 25th */
    [data-theme="christmas"] {
      --bg-primary: #1a472a;
      --bg-card: #0f2818;
      --text-primary: #fef3c7;
      --text-secondary: #fcd34d;
      --text-muted: #d4a84b;
      --border-color: #b91c1c;
      --badge-bg: #dc2626;
      --badge-text: #fef2f2;
      --code-bg: #0f2818;
      --code-border: #166534;
      --shadow-color: rgba(185, 28, 28, 0.4);
      --success-color: #fbbf24;
      --success-glow: rgba(251, 191, 36, 0.8);
      --toggle-bg: #166534;
      --toggle-hover: #15803d;
    }

    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      margin: 0;
      padding: 0;
      background: var(--bg-primary);
      color: var(--text-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      transition: background 0.3s ease, color 0.3s ease;
    }
    .card {
      background: var(--bg-card);
      border-radius: 16px;
      padding: 32px 40px;
      max-width: 540px;
      width: 100%;
      box-shadow: 0 20px 40px var(--shadow-color);
      border: 1px solid var(--border-color);
      transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 999px;
      background: var(--badge-bg);
      color: var(--badge-text);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 12px;
      transition: background 0.3s ease;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 28px;
    }
    p {
      margin: 0 0 18px;
      color: var(--text-secondary);
      line-height: 1.5;
      transition: color 0.3s ease;
    }
    .status {
      margin-top: 12px;
      padding: 12px 14px;
      border-radius: 12px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      transition: background 0.3s ease, border-color 0.3s ease;
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: var(--success-color);
      box-shadow: 0 0 10px var(--success-glow);
      transition: background 0.3s ease, box-shadow 0.3s ease;
    }
    .meta {
      margin-top: 18px;
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: var(--text-muted);
      transition: color 0.3s ease;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      background: var(--code-bg);
      padding: 2px 4px;
      border-radius: 4px;
      border: 1px solid var(--code-border);
      font-size: 12px;
      transition: background 0.3s ease, border-color 0.3s ease;
    }

    /* Theme Toggle Button */
    .theme-toggle {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      background: var(--toggle-bg);
      border: 1px solid var(--border-color);
      border-radius: 999px;
      cursor: pointer;
      font-size: 13px;
      color: var(--text-secondary);
      font-family: inherit;
      transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
    }
    .theme-toggle:hover {
      background: var(--toggle-hover);
    }
    .theme-toggle svg {
      width: 16px;
      height: 16px;
      fill: currentColor;
    }
    .theme-toggle .sun-icon {
      display: none;
    }
    .theme-toggle .moon-icon {
      display: block;
    }
    [data-theme="day"] .theme-toggle .sun-icon {
      display: block;
    }
    [data-theme="day"] .theme-toggle .moon-icon {
      display: none;
    }
    .theme-toggle .christmas-icon {
      display: none;
    }
    [data-theme="christmas"] .theme-toggle .sun-icon {
      display: none;
    }
    [data-theme="christmas"] .theme-toggle .moon-icon {
      display: none;
    }
    [data-theme="christmas"] .theme-toggle .christmas-icon {
      display: block;
    }
  </style>
</head>
<body>
  <main class="card">
    <div class="badge">Build.io demo</div>
    <h1>Build.io Node Demo App</h1>
    <p>
      If you can see this page, your Node.js deployment pipeline is working.
      This app is built from a Git repository using a Node buildpack.<br />
      Awesome job you! 👍
    </p>

    <div class="status">
      <div class="dot"></div>
      <div>
        <strong>Environment:</strong> <span>Production</span><br />
        <small>Last deployment: <span id="deploy-time">${new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}</span></small>
      </div>
    </div>

    <div class="meta">
      <span>Repo: <code>buildio-demo-site</code></span>
      <span>Owner: <code>you</code></span>
    </div>
  </main>

  <!-- Theme Toggle Button -->
  <button class="theme-toggle" id="theme-toggle" aria-label="Toggle theme">
    <svg class="sun-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM11 1h2v3h-2V1zm0 19h2v3h-2v-3zM3.515 4.929l1.414-1.414L7.05 5.636 5.636 7.05 3.515 4.93zM16.95 18.364l1.414-1.414 2.121 2.121-1.414 1.414-2.121-2.121zm2.121-14.85l1.414 1.415-2.121 2.121-1.414-1.414 2.121-2.121zM5.636 16.95l1.414 1.414-2.121 2.121-1.414-1.414 2.121-2.121zM23 11v2h-3v-2h3zM4 11v2H1v-2h3z"/>
    </svg>
    <svg class="moon-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>
    </svg>
    <svg class="christmas-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2l3 6h-2l3 5h-2l3 6H7l3-6H8l3-5H9l3-6zm-1 19h2v2h-2v-2z"/>
    </svg>
    <span class="toggle-label">Switch to Day</span>
  </button>

  <script>
    // Theme management
    (function() {
      const STORAGE_KEY = 'theme-preference';
      const DAY_START = 6;  // 6 AM
      const DAY_END = 18;   // 6 PM

      // Determine if it's Christmas Day (December 25th) based on user's local time
      function isChristmas() {
        const now = new Date();
        return now.getMonth() === 11 && now.getDate() === 25;
      }

      // Determine if it's daytime based on user's local time
      function isDaytime() {
        const hour = new Date().getHours();
        return hour >= DAY_START && hour < DAY_END;
      }

      // Get the theme preference (manual override or auto)
      function getThemePreference() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
        return { mode: 'auto', theme: null };
      }

      // Save theme preference
      function saveThemePreference(mode, theme) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, theme }));
      }

      // Apply theme to document
      function applyTheme(theme) {
        const root = document.documentElement;
        const toggleLabel = document.querySelector('.toggle-label');

        if (theme === 'christmas') {
          root.setAttribute('data-theme', 'christmas');
          if (toggleLabel) toggleLabel.textContent = 'Merry Christmas!';
        } else if (theme === 'day') {
          root.setAttribute('data-theme', 'day');
          if (toggleLabel) toggleLabel.textContent = 'Switch to Night';
        } else {
          root.removeAttribute('data-theme');
          if (toggleLabel) toggleLabel.textContent = 'Switch to Day';
        }
      }

      // Get current effective theme
      function getCurrentTheme() {
        const pref = getThemePreference();
        // Christmas theme takes priority on December 25th (auto mode only)
        if (pref.mode === 'auto' && isChristmas()) {
          return 'christmas';
        }
        if (pref.mode === 'manual') {
          return pref.theme;
        }
        return isDaytime() ? 'day' : 'night';
      }

      // Initialize theme on page load
      function initTheme() {
        const theme = getCurrentTheme();
        applyTheme(theme);
      }

      // Toggle theme manually
      function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') === 'day' ? 'day' : 'night';
        const newTheme = currentTheme === 'day' ? 'night' : 'day';

        applyTheme(newTheme);
        saveThemePreference('manual', newTheme);
      }

      // Initialize immediately (before DOM ready to prevent flash)
      initTheme();

      // Set up toggle button when DOM is ready
      document.addEventListener('DOMContentLoaded', function() {
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
          toggleBtn.addEventListener('click', toggleTheme);
        }
      });

      // Check for time-based theme changes every minute (only if in auto mode)
      setInterval(function() {
        const pref = getThemePreference();
        if (pref.mode === 'auto') {
          const theme = isChristmas() ? 'christmas' : (isDaytime() ? 'day' : 'night');
          applyTheme(theme);
        }
      }, 60000);
    })();
  </script>
</body>
</html>
`;

// Pre-compress HTML for performance (gzip)
const compressedHtml = zlib.gzipSync(Buffer.from(html, "utf-8"));
const htmlBuffer = Buffer.from(html, "utf-8");

const server = http.createServer((req, res) => {
  const startTime = process.hrtime.bigint();

  // Health check endpoint for load balancers and monitoring
  if (req.url === "/health") {
    const uptime = Date.now() - metrics.startTime;
    const avgResponseTime = metrics.requestCount > 0
      ? (metrics.totalResponseTime / metrics.requestCount).toFixed(2)
      : 0;

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.end(JSON.stringify({
      status: "healthy",
      worker: process.pid,
      uptime_ms: uptime,
      requests_handled: metrics.requestCount,
      avg_response_time_ms: avgResponseTime,
      errors: metrics.errors
    }));
    return;
  }

  // Metrics endpoint for monitoring
  if (req.url === "/metrics") {
    const uptime = Date.now() - metrics.startTime;
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.end(`# HELP http_requests_total Total HTTP requests handled
# TYPE http_requests_total counter
http_requests_total{worker="${process.pid}"} ${metrics.requestCount}

# HELP http_response_time_avg_ms Average response time in milliseconds
# TYPE http_response_time_avg_ms gauge
http_response_time_avg_ms{worker="${process.pid}"} ${metrics.requestCount > 0 ? (metrics.totalResponseTime / metrics.requestCount).toFixed(2) : 0}

# HELP process_uptime_ms Process uptime in milliseconds
# TYPE process_uptime_ms gauge
process_uptime_ms{worker="${process.pid}"} ${uptime}

# HELP http_errors_total Total HTTP errors
# TYPE http_errors_total counter
http_errors_total{worker="${process.pid}"} ${metrics.errors}
`);
    return;
  }

  // Main application response with performance optimizations
  metrics.requestCount++;

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  // Cache control headers for CDN and browser caching
  res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
  res.setHeader("ETag", `"${htmlBuffer.length}-v1"`);

  // Security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  // Check if client accepts gzip compression
  const acceptEncoding = req.headers["accept-encoding"] || "";
  if (acceptEncoding.includes("gzip")) {
    res.setHeader("Content-Encoding", "gzip");
    res.setHeader("Content-Length", compressedHtml.length);
    res.end(compressedHtml);
  } else {
    res.setHeader("Content-Length", htmlBuffer.length);
    res.end(htmlBuffer);
  }

  // Track response time
  const endTime = process.hrtime.bigint();
  const responseTimeMs = Number(endTime - startTime) / 1_000_000;
  metrics.totalResponseTime += responseTimeMs;
});

// Optimize server for high concurrency
server.keepAliveTimeout = 65000; // Slightly higher than typical load balancer timeout
server.headersTimeout = 66000;
server.maxConnections = 0; // Unlimited (handled at platform level)

server.on("error", (err) => {
  console.error(`Server error: ${err.message}`);
  metrics.errors++;
});

server.listen(port, () => {
  console.log(`Worker ${process.pid} listening on port ${port}`);
});

// Graceful shutdown for individual worker
process.on("SIGTERM", () => {
  console.log(`Worker ${process.pid} shutting down...`);
  server.close(() => {
    console.log(`Worker ${process.pid} closed all connections`);
    process.exit(0);
  });
});

} // End of worker process block
