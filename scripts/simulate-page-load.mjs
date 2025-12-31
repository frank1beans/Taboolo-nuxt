#!/usr/bin/env node
import { performance } from 'node:perf_hooks';

const args = parseArgs(process.argv.slice(2));

if (args.help || !args.page || !args.project) {
  printUsage(args.help ? 0 : 1);
}

const page = String(args.page).toLowerCase();
if (page !== 'preventivi' && page !== 'listini') {
  console.error('Invalid --page. Use "preventivi" or "listini".');
  printUsage(1);
}

const base = normalizeBase(args.base || 'http://localhost:3000');
const projectId = String(args.project);
const headers = buildHeaders(args);
const concurrency = clampInt(args.concurrency ?? 6, 1, 50);

const shared = {
  base,
  projectId,
  headers,
  verbose: Boolean(args.verbose),
};

try {
  if (page === 'preventivi') {
    await simulatePreventivi(shared, {
      concurrency,
      skipSync: Boolean(args.skipSync),
    });
  } else {
    await simulateListini(shared, {
      estimateId: args.estimate,
      round: args.round,
      company: args.company,
      skipSync: Boolean(args.skipSync),
    });
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

function parseArgs(argv) {
  const parsed = { headers: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    const hasValue = next !== undefined && !next.startsWith('--');
    const value = hasValue ? next : true;
    if (hasValue) i += 1;

    switch (key) {
      case 'page':
        parsed.page = value;
        break;
      case 'project':
        parsed.project = value;
        break;
      case 'estimate':
        parsed.estimate = value;
        break;
      case 'base':
        parsed.base = value;
        break;
      case 'round':
        parsed.round = value;
        break;
      case 'company':
        parsed.company = value;
        break;
      case 'concurrency':
        parsed.concurrency = value;
        break;
      case 'header':
        parsed.headers.push(value);
        break;
      case 'cookie':
        parsed.cookie = value;
        break;
      case 'skip-sync':
        parsed.skipSync = value === true || value === 'true';
        break;
      case 'verbose':
        parsed.verbose = value === true || value === 'true';
        break;
      case 'help':
        parsed.help = true;
        break;
      default:
        parsed.unknown = parsed.unknown || [];
        parsed.unknown.push(key);
        break;
    }
  }
  return parsed;
}

function printUsage(exitCode) {
  const text = `
Usage:
  node scripts/simulate-page-load.mjs --page preventivi --project <id> [options]
  node scripts/simulate-page-load.mjs --page listini --project <id> [options]

Options:
  --base <url>         Base URL (default: http://localhost:3000)
  --estimate <id>      Estimate ID (listini only)
  --round <id>         Round filter (listini only)
  --company <id>       Company filter (listini only)
  --concurrency <n>    Max parallel stats requests (preventivi only, default: 6)
  --header "K: V"      Extra header (repeatable)
  --cookie "k=v; ..."  Cookie header value
  --skip-sync          Skip /api/context/current PUT
  --verbose            Print every request
  --help               Show this help
`;
  console.log(text.trim());
  process.exit(exitCode);
}

function normalizeBase(value) {
  return value.replace(/\/+$/, '');
}

function clampInt(value, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return min;
  return Math.min(Math.max(parsed, min), max);
}

function buildHeaders(args) {
  const headers = {};
  if (Array.isArray(args.headers)) {
    for (const entry of args.headers) {
      const parts = String(entry).split(':');
      if (parts.length < 2) {
        throw new Error('Invalid --header. Use "Key: Value".');
      }
      const key = parts.shift().trim();
      const value = parts.join(':').trim();
      if (key) headers[key] = value;
    }
  }
  if (args.cookie) headers.Cookie = String(args.cookie);
  return headers;
}

async function fetchJson(url, label, options = {}, verbose = false) {
  if (verbose) console.log(`-> ${label}: ${url}`);
  const start = performance.now();
  const response = await fetch(url, options);
  const text = await response.text();
  const elapsedMs = performance.now() - start;
  const bytes = Buffer.byteLength(text, 'utf8');
  if (!response.ok) {
    const snippet = text.slice(0, 200);
    throw new Error(`${label} failed (${response.status} ${response.statusText})${snippet ? `: ${snippet}` : ''}`);
  }
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`${label} returned invalid JSON`);
    }
  }
  return { label, url, ms: elapsedMs, bytes, json };
}

function formatMs(ms) {
  return `${Math.round(ms)} ms`;
}

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  const precision = unit === 0 ? 0 : size >= 10 ? 1 : 2;
  return `${size.toFixed(precision)} ${units[unit]}`;
}

function sum(values) {
  return values.reduce((acc, value) => acc + value, 0);
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const start = performance.now();

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) return;
      results[current] = await worker(items[current], current);
    }
  });

  await Promise.all(runners);
  const elapsedMs = performance.now() - start;
  return { results, elapsedMs };
}

async function simulatePreventivi(shared, opts) {
  const { base, projectId, headers, verbose } = shared;
  console.log('Simulating page: preventivi');
  console.log(`Base: ${base}`);
  console.log(`Project: ${projectId}`);

  const contextUrl = `${base}/api/projects/${projectId}/context`;
  const alertUrl = `${base}/api/projects/${projectId}/offers/alerts/summary?group_by=estimate&status=open`;

  const context = await fetchJson(contextUrl, 'context', { headers }, verbose);
  const alertSummary = await fetchJson(alertUrl, 'alert-summary', { headers }, verbose);

  const estimates = Array.isArray(context.json?.estimates) ? context.json.estimates : [];
  const estimateIds = estimates.map((est) => est?.id).filter(Boolean);

  console.log(`Context: ${formatMs(context.ms)} | ${formatBytes(context.bytes)} | estimates: ${estimateIds.length}`);
  console.log(`Alert summary: ${formatMs(alertSummary.ms)} | ${formatBytes(alertSummary.bytes)}`);

  let statsElapsed = 0;
  let statsResults = [];
  if (estimateIds.length) {
    const items = estimateIds.map((id) => ({
      id,
      url: `${base}/api/projects/${projectId}/analytics/stats?estimate_id=${encodeURIComponent(id)}`,
    }));
    const statsRun = await mapWithConcurrency(items, opts.concurrency, (item) =>
      fetchJson(item.url, `stats:${item.id}`, { headers }, verbose),
    );
    statsElapsed = statsRun.elapsedMs;
    statsResults = statsRun.results;

    const statsTimes = statsResults.map((res) => res.ms);
    const statsBytes = statsResults.map((res) => res.bytes);
    const maxStat = statsTimes.length ? Math.max(...statsTimes) : 0;
    const avgStat = statsTimes.length ? sum(statsTimes) / statsTimes.length : 0;
    console.log(
      `Stats: ${estimateIds.length} req | wall ${formatMs(statsElapsed)} | avg ${formatMs(avgStat)} | max ${formatMs(maxStat)} | ${formatBytes(sum(statsBytes))}`,
    );
  } else {
    console.log('Stats: skipped (no estimates)');
  }

  if (!opts.skipSync) {
    const syncBody = JSON.stringify({
      currentProjectId: projectId,
      currentEstimateId: null,
    });
    const sync = await fetchJson(
      `${base}/api/context/current`,
      'context-sync',
      {
        method: 'PUT',
        headers: { ...headers, 'content-type': 'application/json' },
        body: syncBody,
      },
      verbose,
    );
    console.log(`Context sync: ${formatMs(sync.ms)} | ${formatBytes(sync.bytes)}`);
  }

  const estimatedCritical = context.ms + alertSummary.ms + statsElapsed;
  console.log(`Estimated critical path: ${formatMs(estimatedCritical)}`);
}

async function simulateListini(shared, opts) {
  const { base, projectId, headers, verbose } = shared;
  console.log('Simulating page: listini');
  console.log(`Base: ${base}`);
  console.log(`Project: ${projectId}`);

  const contextUrl = `${base}/api/projects/${projectId}/context`;
  const context = await fetchJson(contextUrl, 'context', { headers }, verbose);
  const estimates = Array.isArray(context.json?.estimates) ? context.json.estimates : [];
  const estimateId =
    opts.estimateId || (estimates.length ? estimates[0]?.id : null);

  console.log(`Context: ${formatMs(context.ms)} | ${formatBytes(context.bytes)} | estimates: ${estimates.length}`);

  if (!estimateId) {
    console.log('No estimate found. Price list and pending calls skipped.');
    return;
  }

  const priceQuery = new URLSearchParams();
  const pendingQuery = new URLSearchParams({ estimate_id: estimateId });
  if (opts.round) {
    priceQuery.set('round', opts.round);
    pendingQuery.set('round', opts.round);
  }
  if (opts.company) {
    priceQuery.set('company', opts.company);
    pendingQuery.set('company', opts.company);
  }

  const priceListUrl = `${base}/api/projects/${projectId}/estimates/${encodeURIComponent(estimateId)}/price-list${
    priceQuery.toString() ? `?${priceQuery.toString()}` : ''
  }`;
  const pendingUrl = `${base}/api/projects/${projectId}/offers/pending?${pendingQuery.toString()}`;

  const [priceList, pending] = await Promise.all([
    fetchJson(priceListUrl, 'price-list', { headers }, verbose),
    fetchJson(pendingUrl, 'pending', { headers }, verbose),
  ]);

  const priceItems = Array.isArray(priceList.json?.items) ? priceList.json.items.length : 0;
  const pendingItems = Array.isArray(pending.json?.items) ? pending.json.items.length : 0;

  console.log(`Price list: ${formatMs(priceList.ms)} | ${formatBytes(priceList.bytes)} | items: ${priceItems}`);
  console.log(`Pending: ${formatMs(pending.ms)} | ${formatBytes(pending.bytes)} | items: ${pendingItems}`);

  if (!opts.skipSync) {
    const syncBody = JSON.stringify({
      currentProjectId: projectId,
      currentEstimateId: estimateId,
    });
    const sync = await fetchJson(
      `${base}/api/context/current`,
      'context-sync',
      {
        method: 'PUT',
        headers: { ...headers, 'content-type': 'application/json' },
        body: syncBody,
      },
      verbose,
    );
    console.log(`Context sync: ${formatMs(sync.ms)} | ${formatBytes(sync.bytes)}`);
  }

  const blockingMs = context.ms + Math.max(priceList.ms, 0);
  console.log(`Estimated critical path: ${formatMs(blockingMs)}`);
}
