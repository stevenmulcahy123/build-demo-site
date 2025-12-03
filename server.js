const http = require("http");

const port = process.env.PORT || 3000;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Build.io Node Demo App</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      margin: 0;
      padding: 0;
      background: #0f172a;
      color: #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: #020617;
      border-radius: 16px;
      padding: 32px 40px;
      max-width: 540px;
      width: 100%;
      box-shadow: 0 20px 40px rgba(15, 23, 42, 0.6);
      border: 1px solid #1e293b;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 999px;
      background: #0f766e;
      color: #ecfeff;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 12px;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 28px;
    }
    p {
      margin: 0 0 18px;
      color: #9ca3af;
      line-height: 1.5;
    }
    .status {
      margin-top: 12px;
      padding: 12px 14px;
      border-radius: 12px;
      background: #020617;
      border: 1px solid #1e293b;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: #22c55e;
      box-shadow: 0 0 10px rgba(34, 197, 94, 0.9);
    }
    .meta {
      margin-top: 18px;
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #6b7280;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      background: #020617;
      padding: 2px 4px;
      border-radius: 4px;
      border: 1px solid #1f2933;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <main class="card">
    <div class="badge">Build.io demo</div>
    <h1>Build.io Node Demo App</h1>
    <p>
      If you can see this page, your Node.js deployment pipeline is working.
      This app is built from a Git repository using a Node buildpack.
      Great job Steven! 👍
    </p>

    <div class="status">
      <div class="dot"></div>
      <div>
        <strong>Environment:</strong> <span>Production</span><br />
        <small>Last deployment: <span id="deploy-time">${new Date().toLocaleString()}</span></small>
      </div>
    </div>

    <div class="meta">
      <span>Repo: <code>buildio-demo-site</code></span>
      <span>Owner: <code>you</code></span>
    </div>
  </main>
</body>
</html>
`;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(html);
});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
