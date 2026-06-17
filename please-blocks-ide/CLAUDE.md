# Please Blocks IDE — Panduan Development

Visual block-based IDE untuk QA automation berbasis `please-test`. Vue 3 + Pinia + Vite, dengan server Express lokal (`server/`) untuk akses disk & menjalankan mocha.

## Arsitektur WAJIB: MVVM (Model ▸ ViewModel ▸ View)

Setiap fitur/perubahan baru **harus** mengikuti pemisahan ini. Perubahan yang melanggar (mis. `fetch` di dalam `.vue`) dianggap belum selesai.

```
src/
  model/                 ← MODEL: state + domain, tanpa Vue UI
    core/                  codegen, factory, parser, blocks (fungsi murni)
    services/              I/O ke server (satu-satunya tempat fetch)
    stores/                Pinia (canvas, dataRegistry, blockRegistry, runner, component)
  composables/           ← VIEWMODEL: useXxx() — orkestrasi, fetch via service, aturan domain
  components/            ← VIEW: .vue tipis, bind ke composable + render
```

### Aturan
- **Model** tidak boleh `import 'vue'` atau `@/components`. Harus bisa dites tanpa mount.
- **Semua `fetch`/HTTP** hanya di `src/model/services/`. Tidak ada `fetch()` di luar sana.
- **ViewModel** (`src/composables/useXxx.js`) memegang: pemanggilan service, orkestrasi multi-store, boot-sync, dirty-detection, aturan lintas-store.
- **View** (`.vue`) hanya: bind ke composable, render, state UI lokal.

### Yang boleh vs tidak boleh di View
| ✅ Boleh di View | ❌ Harus lewat ViewModel/Service |
|---|---|
| Fungsi murni Model: `generateSpec`, `exportProject`, `parseSpec`, `validateStep` (stateless, tanpa IO) | `fetch`/HTTP → service |
| Baca 1 store untuk binding/guard (`canvas.features.length`) | Orkestrasi 2+ store (open/new project, import, save+prune) |
| State UI lokal (tab aktif, toggle, dropdown) | Boot-sync, alur lintas-store |

Komponen yang isinya murni state UI lokal **tidak** wajib jadi composable — ekstraksi hanya untuk orkestrasi/I-O & logika terduplikasi.

### Composable yang sudah ada (rujukan pola)
`useProjectWorkspace` (open/new/close, boot-sync), `useSaveProject` (save+prune, dirty), `useProjectImport`, `useTestRunnerControl` (validate vs runReal), `usePanelResize`, `useCodeHighlight`, `usePaletteFilter`.

## Perintah
- `npm run dev` — server Express + Vite bersamaan (server hot-reload via `node --watch`).
- `npx vite build` — verifikasi build (lakukan setiap selesai perubahan).
- Server perlu aktif untuk: Open/New project, Save, Import Project, Run Real.

## Catatan
- Canvas = source of truth; file `.spec.js`/`data`/`components` adalah output (lihat RENCANA_PENGEMBANGAN.md).
- DataRef disimpan sebagai `{ type:'dataref', path:'ACCOUNT.valid' }`, bukan nilai literal.
- Roadmap & keputusan arsitektur lengkap: `../RENCANA_PENGEMBANGAN.md`.
