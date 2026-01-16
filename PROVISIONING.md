# High Traffic Provisioning Guide

This document describes the provisioning configuration for handling 100X traffic levels.

## Overview

The application has been configured to handle a significant traffic spike (100X normal levels) through a combination of:

1. **Horizontal scaling** - Multiple dyno instances behind Heroku's load balancer
2. **Vertical scaling** - Upgraded dyno size for more CPU/memory per instance
3. **Application-level optimizations** - Clustering, compression, and caching
4. **Auto-scaling** - Dynamic capacity adjustment based on response times

## Infrastructure Configuration

### Heroku Formation (app.json)

| Setting | Previous | New | Impact |
|---------|----------|-----|--------|
| Dyno Size | Standard-1X | Performance-L | 14GB RAM, 8 vCPUs per dyno |
| Dyno Quantity | 1 | 10 (base) | 10X horizontal capacity |
| Max Connections | 1,024 | 10,240 | 10X concurrent connections |
| Response Timeout | 30s | 60s | Better handling of traffic bursts |

### Auto-scaling Configuration

- **Enabled**: Yes
- **Minimum Dynos**: 5
- **Maximum Dynos**: 50
- **Target P95 Response Time**: 500ms

The auto-scaler will add dynos when P95 response time exceeds 500ms and remove them when the system is over-provisioned.

## Application Optimizations

### Node.js Clustering (`server.js`)

The server now uses Node.js clustering to utilize all available CPU cores:

- Primary process manages worker processes
- One worker process per CPU core
- Automatic worker restart on crash
- Graceful shutdown handling

### Performance Enhancements

| Feature | Description |
|---------|-------------|
| Gzip Compression | Pre-compressed HTML response (~70% size reduction) |
| Browser Caching | `Cache-Control: public, max-age=300` (5 minutes) |
| Stale-While-Revalidate | 10-minute grace period for cache revalidation |
| ETag Headers | Efficient conditional requests |
| Keep-Alive | Connection reuse with 65s timeout |

### Security Headers

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`

## Monitoring Endpoints

### Health Check

```
GET /health
```

Returns JSON with worker health status:

```json
{
  "status": "healthy",
  "worker": 12345,
  "uptime_ms": 3600000,
  "requests_handled": 50000,
  "avg_response_time_ms": 2.5,
  "errors": 0
}
```

Use this endpoint for:
- Load balancer health checks
- Kubernetes liveness probes
- External monitoring services

### Prometheus Metrics

```
GET /metrics
```

Returns Prometheus-formatted metrics:

```
# HELP http_requests_total Total HTTP requests handled
# TYPE http_requests_total counter
http_requests_total{worker="12345"} 50000

# HELP http_response_time_avg_ms Average response time in milliseconds
# TYPE http_response_time_avg_ms gauge
http_response_time_avg_ms{worker="12345"} 2.5

# HELP process_uptime_ms Process uptime in milliseconds
# TYPE process_uptime_ms gauge
process_uptime_ms{worker="12345"} 3600000

# HELP http_errors_total Total HTTP errors
# TYPE http_errors_total counter
http_errors_total{worker="12345"} 0
```

## Load Testing

### Running Load Tests

```bash
# Quick validation (30 seconds)
npm run loadtest:quick

# Full 100X traffic simulation (2 minutes)
npm run loadtest:100x

# Custom test
node loadtest.js --url https://your-app.herokuapp.com --duration 60 --concurrency 100 --rps 1000
```

### Load Test Options

| Option | Default | Description |
|--------|---------|-------------|
| `--url` | http://localhost:3000 | Target URL |
| `--duration` | 60 | Test duration in seconds |
| `--concurrency` | 100 | Concurrent connections |
| `--rps` | 1000 | Target requests per second |

### Validation Criteria

The load test validates these criteria for 100X traffic readiness:

| Check | Threshold | Description |
|-------|-----------|-------------|
| Success Rate | > 99% | Requests completing successfully |
| P95 Latency | < 500ms | 95th percentile response time |
| P99 Latency | < 1000ms | 99th percentile response time |
| Connection Errors | 0 | No refused/reset connections |

## Capacity Planning

### Estimated Capacity

With the current configuration:

| Metric | Single Dyno | 10 Dynos | 50 Dynos (max) |
|--------|-------------|----------|----------------|
| Workers | 8 | 80 | 400 |
| Est. RPS | ~2,000 | ~20,000 | ~100,000 |
| Connections | 1,024 | 10,240 | 51,200 |

### Scaling Recommendations

**Before the traffic spike:**
1. Run `npm run loadtest:100x` against staging environment
2. Verify all validation checks pass
3. Enable auto-scaling in Heroku dashboard
4. Set up alerts for P95 response time and error rate

**During the traffic spike:**
1. Monitor `/metrics` endpoint with Prometheus/Grafana
2. Watch for auto-scaling events
3. Review `/health` endpoint responses
4. Check Heroku metrics dashboard

**After the traffic spike:**
1. Review auto-scaling behavior
2. Analyze performance metrics
3. Adjust thresholds if needed
4. Scale down manually if auto-scaling is slow

## Troubleshooting

### High Response Times

1. Check if auto-scaling is triggering
2. Verify dyno memory usage (may need larger dyno size)
3. Review `/metrics` for per-worker distribution
4. Check for downstream service bottlenecks

### Connection Errors

1. Verify `max_connections` setting in `app.json`
2. Check if hitting Heroku router limits
3. Review keep-alive settings
4. Consider adding a CDN for static content

### Worker Crashes

1. Check Heroku logs: `heroku logs --tail`
2. Look for memory exhaustion (OOM kills)
3. Review error counts in `/health` endpoint
4. Workers auto-restart, but frequent crashes indicate issues

## Rollback Plan

If issues occur during high traffic:

1. Manually scale dynos: `heroku ps:scale web=20`
2. Revert to previous `app.json` if needed
3. Disable auto-scaling temporarily
4. Enable Heroku's maintenance mode as last resort
