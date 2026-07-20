/**
 * server/routes/runner.js
 *
 * POST /api/runner/start  — tulis files ke disk lalu spawn mocha
 * GET  /api/runner/stream/:runId — SSE stream log
 * POST /api/runner/stop/:runId  — kill proses
 */
import { Router }   from 'express'
import { randomUUID } from 'crypto'
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'
import { join, dirname, resolve, sep } from 'path'
import { startRun, getActiveRun } from '../lib/testRunner.js'

export const runnerRouter = Router()

/**
 * POST /api/runner/start
 * Body: { projectPath, files, browser, specFile? }
 * specFile - path relatif satu spec (mis. 'feature/login.spec.js') → jalankan fitur itu saja
 */
runnerRouter.post('/start', (req, res) => {
  const { projectPath, files, browser = 'chromium', specFile = '' } = req.body

  if (!projectPath) {
    return res.status(400).json({ error: 'projectPath diperlukan' })
  }
  if (!existsSync(projectPath)) {
    return res.status(400).json({ error: `Folder tidak ditemukan: ${projectPath}` })
  }

  // Tulis semua file ke disk sebelum run
  if (Array.isArray(files) && files.length > 0) {
    for (const file of files) {
      try {
        const fullPath = join(projectPath, file.path)
        mkdirSync(dirname(fullPath), { recursive: true })
        writeFileSync(fullPath, file.content, 'utf-8')
      } catch (err) {
        return res.status(500).json({ error: `Gagal menulis ${file.path}: ${err.message}` })
      }
    }
  }

  const runId = randomUUID()
  // startRun async — daftarkan ke map dulu, lanjut di background
  startRun(runId, projectPath, browser, specFile)

  // Kembalikan runId segera — client bisa langsung connect ke /stream
  res.json({ ok: true, runId })
})

/**
 * GET /api/runner/stream/:runId
 * Server-Sent Events — client listen sampai event "done"
 */
runnerRouter.get('/stream/:runId', (req, res) => {
  const { runId } = req.params
  const run = getActiveRun(runId)

  // SSE headers
  res.setHeader('Content-Type',  'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection',    'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  if (!run) {
    res.write(`event: error\ndata: ${JSON.stringify({ message: 'Run tidak ditemukan atau sudah selesai' })}\n\n`)
    res.end()
    return
  }

  run.addClient(res)

  // Cleanup saat client disconnect
  req.on('close', () => run.clients.delete(res))
})

/**
 * POST /api/runner/stop/:runId
 */
runnerRouter.post('/stop/:runId', (req, res) => {
  const { runId } = req.params
  const run = getActiveRun(runId)

  if (!run) {
    return res.status(404).json({ error: 'Run tidak ditemukan' })
  }

  run.stop()
  res.json({ ok: true })
})

/**
 * GET /api/runner/report?projectPath=/abs/project
 * Baca please-report/results.json (ditulis PleaseReporter) hasil run terakhir —
 * berisi status/error/attachment (screenshot, video) per test case.
 */
runnerRouter.get('/report', (req, res) => {
  const projectPath = req.query.projectPath ? String(req.query.projectPath) : ''
  if (!projectPath) return res.status(400).json({ error: 'projectPath diperlukan' })

  const absProject = resolve(projectPath)
  const reportPath = join(absProject, 'please-report', 'results.json')

  if (!existsSync(reportPath)) {
    return res.status(404).json({ error: 'Laporan belum tersedia — jalankan test terlebih dahulu' })
  }

  try {
    const data = JSON.parse(readFileSync(reportPath, 'utf-8'))
    res.json({ ok: true, ...data })
  } catch (err) {
    res.status(500).json({ error: `Gagal membaca laporan: ${err.message}` })
  }
})

/**
 * GET /api/runner/artifact?projectPath=/abs/project&file=test-results/xxx/screenshot.png
 * Serve satu file attachment (screenshot/video) hasil Playwright.
 * `file` harus berupa path relatif yang tetap berada di dalam projectPath (anti path traversal).
 */
runnerRouter.get('/artifact', (req, res) => {
  const projectPath = req.query.projectPath ? String(req.query.projectPath) : ''
  const file = req.query.file ? String(req.query.file) : ''
  if (!projectPath || !file) return res.status(400).json({ error: 'projectPath dan file diperlukan' })

  const absProject = resolve(projectPath)
  const absFile = resolve(absProject, file)

  // Cegah path traversal: absFile wajib berada di dalam absProject.
  if (absFile !== absProject && !absFile.startsWith(absProject + sep)) {
    return res.status(403).json({ error: 'Path file tidak valid' })
  }
  if (!existsSync(absFile)) {
    return res.status(404).json({ error: 'File tidak ditemukan' })
  }

  res.sendFile(absFile)
})
