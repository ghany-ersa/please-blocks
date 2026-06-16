/**
 * server/routes/files.js
 * POST /api/files/write  — terima array files dari IDE, tulis ke disk.
 * GET  /api/files/browse — list isi direktori untuk directory picker.
 */
import { Router }                                from 'express'
import { writeFileSync, mkdirSync, readdirSync,
         statSync, existsSync }                  from 'fs'
import { join, dirname, resolve, sep }           from 'path'
import { homedir }                               from 'os'

export const filesRouter = Router()

/**
 * POST /api/files/write
 * Body: { projectPath: string, files: [{ path, content }] }
 */
filesRouter.post('/write', (req, res) => {
  const { projectPath, files } = req.body

  if (!projectPath || !Array.isArray(files)) {
    return res.status(400).json({ error: 'projectPath dan files diperlukan' })
  }

  const written = []
  const errors  = []

  for (const file of files) {
    try {
      const fullPath = join(projectPath, file.path)
      mkdirSync(dirname(fullPath), { recursive: true })
      writeFileSync(fullPath, file.content, 'utf-8')
      written.push(file.path)
    } catch (err) {
      errors.push({ path: file.path, error: err.message })
    }
  }

  res.json({ ok: errors.length === 0, written, errors })
})

/**
 * GET /api/files/browse?path=/some/dir
 * Kembalikan daftar entry di direktori — hanya folder dan file relevan.
 */
filesRouter.get('/browse', (req, res) => {
  // Default ke home directory jika path tidak disediakan
  const reqPath = req.query.path ? String(req.query.path) : homedir()
  const absPath = resolve(reqPath)

  if (!existsSync(absPath)) {
    return res.status(404).json({ error: `Path tidak ditemukan: ${absPath}` })
  }

  let stat
  try { stat = statSync(absPath) } catch {
    return res.status(403).json({ error: 'Tidak bisa membaca path ini' })
  }

  if (!stat.isDirectory()) {
    return res.status(400).json({ error: 'Path bukan direktori' })
  }

  let entries = []
  try {
    entries = readdirSync(absPath, { withFileTypes: true })
  } catch {
    return res.status(403).json({ error: 'Tidak punya izin membaca direktori ini' })
  }

  const items = entries
    .filter(e => !e.name.startsWith('.'))   // sembunyikan hidden files
    .map(e => {
      const isDir = e.isDirectory()
      return {
        name:  e.name,
        isDir,
        path:  join(absPath, e.name),
        // tandai folder yang sepertinya project test
        isProject: isDir && hasPackageJson(join(absPath, e.name))
      }
    })
    .sort((a, b) => {
      // Folder dulu, lalu file; alfabet dalam tiap grup
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
      return a.name.localeCompare(b.name)
    })

  // Breadcrumb dari root ke absPath
  const parts  = absPath.split(sep).filter(Boolean)
  const crumbs = parts.map((part, i) => ({
    name: part || sep,
    path: sep + parts.slice(0, i + 1).join(sep)
  }))
  // Tambahkan root di depan untuk Unix
  if (absPath.startsWith(sep)) {
    crumbs.unshift({ name: '/', path: '/' })
  }

  res.json({ path: absPath, crumbs, items })
})

function hasPackageJson(dirPath) {
  try { return existsSync(join(dirPath, 'package.json')) } catch { return false }
}
