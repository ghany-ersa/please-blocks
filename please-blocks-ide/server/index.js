/**
 * server/index.js
 * Express local server untuk Please Blocks — Jalur B.
 * Menerima file dari IDE, menulis ke disk, menjalankan mocha, stream log via SSE.
 */
import express  from 'express'
import cors     from 'cors'
import { filesRouter  } from './routes/files.js'
import { runnerRouter } from './routes/runner.js'

const app  = express()
const PORT = process.env.PORT || 3737

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json({ limit: '10mb' }))

app.use('/api/files',  filesRouter)
app.use('/api/runner', runnerRouter)

app.get('/api/health', (_req, res) => res.json({ ok: true, version: '1.0.0' }))

app.listen(PORT, () => {
  console.log(`[please-blocks server] http://localhost:${PORT}`)
})
