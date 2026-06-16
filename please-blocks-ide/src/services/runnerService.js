/**
 * runnerService.js
 * Komunikasi Vue → Express server:
 *   - startRun()  → POST /api/runner/start → terima runId → buka SSE stream
 *   - stopRun()   → POST /api/runner/stop/:runId
 *   - checkHealth() → GET /api/health
 */

const BASE = '/api'

/**
 * Cek apakah server Express sedang berjalan.
 * @returns {Promise<boolean>}
 */
export async function checkServerHealth() {
  try {
    const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Mulai run sungguhan via server.
 *
 * @param {Object}   opts
 * @param {string}   opts.projectPath  - absolute path folder project
 * @param {Array}    opts.files        - [{ path, content }] dari exportProject()
 * @param {string}   opts.browser      - 'chrome' | 'firefox' | 'edge'
 * @param {Function} opts.onLog        - callback({ level, text })
 * @param {Function} opts.onDone       - callback({ exitCode })
 * @param {Function} opts.onError      - callback(errorMessage)
 * @returns {Promise<{ stop: Function }>}
 */
export async function startRun({ projectPath, files, browser, onLog, onDone, onError }) {
  // 1. Kirim files + mulai proses mocha
  let runId
  try {
    const res = await fetch(`${BASE}/runner/start`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ projectPath, files, browser })
    })
    const data = await res.json()
    if (!res.ok || !data.ok) {
      onError?.(data.error || 'Server gagal memulai run')
      return { stop: () => {} }
    }
    runId = data.runId
  } catch (err) {
    onError?.(`Tidak dapat terhubung ke server: ${err.message}`)
    return { stop: () => {} }
  }

  // 2. Buka SSE stream
  const es = new EventSource(`${BASE}/runner/stream/${runId}`)

  es.addEventListener('log', (e) => {
    try { onLog?.(JSON.parse(e.data)) } catch { /* ignore */ }
  })

  es.addEventListener('start', (e) => {
    try {
      const d = JSON.parse(e.data)
      onLog?.({ level: 'cmd', text: `$ npx mocha index.js  [${d.browser}]` })
    } catch { /* ignore */ }
  })

  es.addEventListener('done', (e) => {
    try {
      const d = JSON.parse(e.data)
      onDone?.(d)
    } catch { /* ignore */ }
    es.close()
  })

  es.addEventListener('error', (e) => {
    try {
      const d = JSON.parse(e.data)
      onError?.(d.message)
    } catch { /* ignore */ }
    es.close()
  })

  es.onerror = () => {
    // SSE ditutup dari server saat done — ini normal, abaikan
  }

  return {
    stop: async () => {
      es.close()
      try {
        await fetch(`${BASE}/runner/stop/${runId}`, { method: 'POST' })
      } catch { /* ignore */ }
    }
  }
}
