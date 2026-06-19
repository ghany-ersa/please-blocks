# Glosarium Please Blocks IDE

> Referensi istilah-istilah yang digunakan dalam sistem Please Blocks IDE.
>
> **Dibuat oleh:** Ghany Abdillah Ersa
> **Versi:** 1.0
> **Tanggal:** 2026-06-18

---

## Daftar Isi

1. [Arsitektur & Lapisan](#1-arsitektur--lapisan)
2. [Block System](#2-block-system)
3. [Canvas](#3-canvas)
4. [Data](#4-data)
5. [Tipe Input Field](#5-tipe-input-field)
6. [Factory & Code Generator](#6-factory--code-generator)
7. [Component](#7-component)
8. [Test Runner & Reporting](#8-test-runner--reporting)
9. [Project & Workspace](#9-project--workspace)
10. [Selector](#10-selector)

---

## 1. Arsitektur & Lapisan

### Model
Lapisan paling bawah dalam pola MVVM. Berisi state aplikasi, aturan domain, dan akses I/O ke disk/server. Tidak boleh mengimpor `vue` atau komponen UI apapun — harus bisa dijalankan dan dites tanpa me-mount Vue.

Lokasi: `src/model/` → `core/`, `services/`, `stores/`

### ViewModel
Lapisan tengah dalam pola MVVM. Diimplementasikan sebagai composable (`useXxx.js`) yang mengorkestrasikan multi-store, memanggil service, dan memegang aturan lintas-domain. Mengembalikan state reaktif dan method siap pakai ke View.

Lokasi: `src/composables/`

### View
Lapisan UI dalam pola MVVM. Komponen `.vue` yang hanya melakukan binding ke ViewModel dan merender tampilan. Tidak boleh ada `fetch()` langsung, akses multi-store kompleks, atau orkestrasi lintas-store di dalam komponen.

Lokasi: `src/components/`

### Service
Modul yang menangani semua komunikasi HTTP ke server lokal. Satu-satunya tempat di mana `fetch()` boleh dipanggil. Tidak ada service call di luar folder ini.

Lokasi: `src/model/services/`

### Store
State global berbasis Pinia. Setiap store mengelola domain tertentu:

| Store | Domain |
|---|---|
| `canvasStore` | Feature, Test Case, Step, drag & drop state |
| `dataRegistry` | DataRef entries hasil parse dari file data |
| `blockRegistry` | Semua definisi blok (built-in + dinamis) |
| `runnerStore` | Status test runner, log, dan hasil test |
| `componentStore` | Definisi component yang dibuat via Component Builder |

### Composable
Fungsi `useXxx()` yang menjadi ViewModel dalam pola MVVM. Mengembalikan state reaktif dan method yang siap dipakai langsung oleh komponen `.vue`. Composable yang sudah ada:

| Composable | Tanggung Jawab |
|---|---|
| `useProjectWorkspace` | Open/New/Close project, boot-sync disk |
| `useSaveProject` | Save + prune, dirty-state tracking |
| `useProjectImport` | Import project dari folder existing |
| `useTestRunnerControl` | Trigger validate/run, parsing log |
| `usePanelResize` | Drag-to-resize panel |
| `useCodeHighlight` | Syntax highlighting di code preview |
| `usePaletteFilter` | Filter dan pencarian di block palette |
| `useDropdownControl` | Logika buka/tutup/posisi dropdown |
| `useStepActions` | Handler remove/update/reorder step |
| `useStepSelection` | Manajemen step yang dipilih |

---

## 2. Block System

### Block
Unit terkecil dalam Please Blocks. Merepresentasikan satu langkah/aksi dalam test. Setiap block mapping 1:1 ke satu method `please-test`. QA menyusun block di canvas; IDE menghasilkan kode JavaScript secara otomatis.

### Block ID
Identifier unik untuk setiap jenis blok. Menggunakan format `kategori.nama`.

Contoh: `action.click`, `nav.goto`, `assert.seeText`, `comp.auth.login`

### Block Definition
Objek JavaScript yang mendefinisikan sebuah blok secara lengkap:

```js
{
  id:       String,         // Unique ID, misal 'action.click'
  type:     String,         // 'navigation' | 'action' | 'assertion' | 'component' | 'util'
  label:    String,         // Nama tampil di palette
  icon:     String,         // Emoji icon
  color:    String,         // Hex warna kategori
  inputs:   Array,          // Daftar field yang bisa diisi QA
  output:   String | null,  // null atau 'text' | 'value' (canvas variable)
  codegen:  Function,       // (inputs) => String kode JS
  validate: Function        // (inputs) => String pesan error | null
}
```

### Block Registry
Store Pinia (`blockRegistry`) yang menyimpan semua definisi blok yang aktif: built-in blocks dan component blocks yang di-generate secara dinamis.

### Built-in Block
Blok bawaan IDE yang hardcoded dan mapping langsung ke method `please-test`. Tidak berubah kecuali ada update IDE.

Kategori: Navigation, Actions, Assertions, Utilities

### Component Block
Blok dinamis yang di-generate otomatis dari parsing file `components/*.js`. Setiap method dalam class Component menjadi satu blok. Muncul di palette secara otomatis setelah Component Factory berjalan.

Format ID: `comp.[namaComponent].[namaMethod]` — contoh: `comp.auth.login`

### Block Palette
Panel kiri IDE. Menampilkan semua blok yang tersedia dikelompokkan berdasarkan kategori, dilengkapi fitur pencarian. Blok di-drag dari sini ke canvas.

### Block Inspector
Panel kanan IDE. Tampil ketika sebuah step dipilih di canvas. Digunakan QA untuk mengisi input field setiap blok (selector, value, dataref, dsb.).

### Kategori Blok

| Kategori | Warna | Blok yang Tersedia |
|---|---|---|
| Navigation | Biru | Go To, Verify Page |
| Actions | Hijau | Click, Fill, Fill & Enter, Clear Input, Date Picker, Upload File, Scroll To |
| Assertions | Merah | See Text, Assert Equal, Assert Not Equal, Get Text, Get Value, Force Fail |
| Utilities | Abu-abu | Wait |
| Components | Ungu | Dinamis, sesuai component yang dibuat |

---

## 3. Canvas

### Canvas
Area utama IDE. Tempat QA menyusun test secara visual dalam hierarki: Feature → Test Case → Steps.

### Canvas State
Kondisi canvas saat ini — seluruh features, test cases, steps, dan input yang sudah diisi. Disimpan di `canvasStore` dan di-persist ke `localStorage`. Canvas adalah **source of truth**; file `.spec.js` adalah output-nya.

### Feature
Container level pertama di canvas. Merepresentasikan blok `describe()` di Mocha. Satu Feature menghasilkan satu file `feature/[nama].spec.js`.

Property: `id`, `label`, `testCases`, `collapsed`, `enabled`

### Test Case
Container level kedua, di dalam Feature. Merepresentasikan blok `it()` di Mocha. Berisi urutan Steps yang akan dieksekusi secara berurutan.

Property: `id`, `label`, `steps`, `collapsed`

### Step
Item terkecil di canvas. Satu Step = satu blok yang sudah dikonfigurasi (blockId + inputs). Merepresentasikan satu baris kode dalam test.

Property: `id`, `blockId`, `inputs`, `hasError`, `note`

### Feature Toggle
Tombol enable/disable per Feature di canvas. Feature yang di-disable tidak akan diikutkan saat run test. Status ini mengontrol isi file `index.js`.

### Canvas Variable
Variabel yang dibuat dari output blok `Get Text` atau `Get Value`. Disimpan dengan nama yang ditentukan QA dan bisa direferensikan oleh blok assertion berikutnya menggunakan input type `varref`.

Contoh: blok `Get Text` dengan varName `headerText` → blok `Assert Equal` bisa memilih `$headerText` sebagai nilai aktual.

### Drag & Drop
Mekanisme menambah step ke Test Case dengan menyeret blok dari Block Palette ke area Test Case di canvas.

### Drop Target
Test Case yang sedang di-hover saat operasi drag berlangsung. Di-highlight untuk menunjukkan ke mana blok akan dijatuhkan.

### Collapsed / Expand
State tampilan Feature atau Test Case. Saat collapsed, isi (test cases atau steps) disembunyikan untuk menghemat ruang di canvas.

### Note
Komentar opsional per Step. Muncul sebagai komentar (`// note`) di kode yang di-generate.

---

## 4. Data

### DataRef
Referensi ke path data, bukan nilai literal. Blok tidak menyimpan nilai `'student'`, melainkan menyimpan `{ type: 'dataref', path: 'ACCOUNT.valid.username' }`. Nilai aslinya di-resolve saat code generation.

Keuntungan: mengubah data di Data Manager otomatis berlaku ke semua blok yang mereferensikannya tanpa perlu edit canvas.

### Data Registry
Store Pinia (`dataRegistry`) yang berisi semua DataRef entries hasil parse dan flatten dari file data. Dipakai oleh dropdown di Block Inspector. Reaktif — update otomatis ketika data diubah.

### Data Manager
UI editor di IDE untuk mengelola file `data/*.js`. Mendukung multi-file, CRUD (tambah/ubah/hapus) untuk Group, Entry, dan Field.

### Data Factory
Pipeline yang memproses file data menjadi DataRef entries:

```
File data/*.js
    ↓ Parse (require + cache-bust)
    ↓ flattenDataTree() — nested object → flat path array
    ↓ Schema Builder — tambah metadata (fileId, group, compatibleWith)
    ↓ Register ke dataRegistry (Pinia)
```

### Data File
File JavaScript di folder `data/` yang berisi object hierarkis test data. File default: `data/main.js`. Mendukung multi-file.

### Group
Kategori data level pertama dalam sebuah Data File. Contoh: `URL`, `ACCOUNT`. Nama selalu ditulis huruf kapital.

### Entry
Item dalam sebuah Group. Berisi sekumpulan field yang terkait. Contoh: `URL.login`, `ACCOUNT.valid`.

### Field
Properti primitif dalam sebuah Entry. Contoh: `url`, `title`, `username`, `password`. Nilai field inilah yang akhirnya dipakai dalam kode test.

### flattenDataTree
Fungsi rekursif yang mengubah object data hierarkis menjadi array flat path. Digunakan oleh Data Factory.

```js
// Input:
{ URL: { login: { url: 'https://...', title: 'Login Page' } } }

// Output:
[
  { path: 'URL',             type: 'object', value: { login: {...} } },
  { path: 'URL.login',       type: 'object', value: { url, title } },
  { path: 'URL.login.url',   type: 'string', value: 'https://...' },
  { path: 'URL.login.title', type: 'string', value: 'Login Page' },
]
```

### Env Variable
Variabel lingkungan dari file `.env`. Diakses di kode dengan `process.env.KEY`. Dapat dipakai sebagai nilai field dalam data entry (contoh: `process.env.ACCOUNT_PASSWORD`).

### Env Editor
UI di IDE untuk membaca dan menulis variabel di file `.env` tanpa perlu membuka file secara manual.

### Static Data
Salah satu dari empat jenis input blok. Data yang bersumber dari `data/*.js` dan direferensikan via DataRef.

### Inline Value
Salah satu dari empat jenis input blok. Nilai yang diketik langsung oleh QA di Block Inspector, tanpa mereferensikan data eksternal.

### Empat Jenis Input Blok

| Jenis | Sumber | Contoh |
|---|---|---|
| Static Data | `data/*.js` | `URL.login`, `ACCOUNT.valid` |
| Env Variable | `.env` | `process.env.BASE_URL` |
| Canvas Variable | Output blok sebelumnya | `$headerText` dari `Get Text` |
| Inline Value | Diketik langsung | `'Your username is invalid!'` |

---

## 5. Tipe Input Field

### `text`
Input teks bebas. Digunakan untuk label deskriptif elemen — bukan nilai test, bukan selector. Label ini muncul di pesan error saat test gagal.

### `selector`
Input untuk selector elemen HTML. Mendukung format: XPath (`//div[@id="x"]`), CSS (`.class`, `#id`), dan `link=teks`. Dilengkapi Selector Inspector untuk validasi dan panduan format.

### `value`
Input nilai yang fleksibel. Bisa berupa inline string, DataRef, atau Canvas Variable. Dirender sebagai `ValueInput.vue` yang menggabungkan ketiga mode dalam satu komponen.

### `dataref`
Dropdown yang menampilkan pilihan dari Data Registry. QA memilih path data (contoh: `ACCOUNT.valid`) tanpa perlu mengetik path secara manual.

### `varref`
Dropdown yang menampilkan Canvas Variables yang sudah dibuat oleh blok-blok sebelumnya dalam test case yang sama. Digunakan untuk mem-pipe output `Get Text`/`Get Value` ke blok assertion.

### `number`
Input angka. Contoh penggunaan: durasi `Wait` dalam milidetik.

### `boolean`
Toggle switch untuk nilai `true` atau `false`.

---

## 6. Factory & Code Generator

### specGenerator
Modul codegen yang mengubah canvas state (Feature + Test Case + Steps) menjadi file `feature/*.spec.js`. Dipanggil setiap kali canvas berubah (debounced). Menangani: resolusi import otomatis, resolusi input (dataref/varref/inline), dan output kode Mocha yang valid.

### componentGenerator
Modul codegen yang mengubah definisi component dari Component Builder menjadi file `components/*.js` yang berisi class JavaScript.

### dataGenerator
Modul codegen yang mengubah state Data Manager menjadi file `data/main.js` (atau file data lainnya).

### indexGenerator
Modul codegen yang generate file `index.js`. File ini mengontrol feature mana yang dijalankan berdasarkan status enabled/disabled setiap Feature di canvas.

### dataResolver
Fungsi yang meresolusi semua jenis input blok menjadi string JavaScript yang valid untuk ditulis ke dalam kode test.

```js
{ type: 'dataref', path: 'ACCOUNT.valid' }  →  'ACCOUNT.valid'
{ type: 'varref',  varName: 'headerText' }  →  'headerText'
{ type: 'inline',  value: 'student' }       →  "'student'"
{ type: 'selector', value: '#username' }    →  "'#username'"
```

### Auto-Import Detection
Bagian dari `specGenerator`. Memindai semua DataRef dan Component yang dipakai dalam sebuah Feature, lalu generate baris `require()` yang diperlukan secara otomatis di bagian atas file `.spec.js`.

### Reverse Codegen
Fitur yang bekerja kebalikan dari code generation: mem-parse file `.spec.js` yang sudah ada (manual atau dari project lama) kembali menjadi canvas nodes menggunakan AST parser.

### Component Factory
Pipeline yang mem-parse file `components/*.js` menggunakan AST parser:

```
File components/*.js
    ↓ AST Parser (@babel/parser)
    ↓ Ekstrak class, method, dan parameter
    ↓ buildComponentBlock() per method
    ↓ Register ke blockRegistry
    → Blok muncul di palette
```

### AST Parser
`@babel/parser` — library yang digunakan untuk mengurai (parse) file JavaScript menjadi Abstract Syntax Tree. Dipakai oleh Component Factory dan Reverse Codegen untuk membaca struktur kode tanpa mengeksekusinya.

### statementParser
Modul shared yang mem-parse statement JavaScript. Berbagi logika antara `specParser` (untuk reverse codegen) dan `componentFileParser` (untuk Component Factory).

### codegen()
Fungsi dalam Block Definition yang mengubah input QA menjadi satu baris kode JavaScript. Dipanggil oleh `specGenerator` untuk setiap step.

```js
// Contoh dari blok action.click:
codegen: (inputs) => `await please.click('${inputs.label}', '${inputs.selector}')`
```

### validate()
Fungsi dalam Block Definition yang memvalidasi apakah input sudah lengkap dan benar. Mengembalikan pesan error (string) jika ada masalah, atau `null` jika valid. Hasil validasi menentukan apakah step tampil dengan badge merah di canvas.

---

## 7. Component

### Component
Kelas JavaScript reusable yang berisi kumpulan aksi yang sering diulang. Disimpan di folder `components/`. Contoh: `Auth` (berisi login, logout), `Checkout` (berisi addToCart, proceed).

### Component Builder
UI di IDE untuk membuat component baru secara visual: tentukan nama component, tambah method, definisikan parameter, susun blok-blok steps per method, lalu simpan.

### Method
Fungsi dalam sebuah Component. Setiap method menjadi satu blok di Block Palette. Contoh: `Auth.login(user)`, `Auth.logout()`.

### Export Name
Nama konstanta yang dipakai dalam kode test untuk mengakses component. Mengikuti konvensi huruf kapital. Contoh: class `Auth` → export name `AUTH`, sehingga dipakai sebagai `await AUTH.login(user)`.

### Component Store
Store Pinia (`componentStore`) yang menyimpan definisi semua component yang sedang aktif di IDE, termasuk daftar method dan parameter masing-masing.

### Extract to Component
Fitur di canvas yang memungkinkan QA memilih beberapa steps dalam test case, lalu mengekstraknya menjadi satu method dalam sebuah component. Steps yang dipilih digantikan oleh satu step component block.

---

## 8. Test Runner & Reporting

### Test Runner
Panel di IDE untuk menjalankan test. Menampilkan log output real-time dari proses Mocha dan status akhir setiap test case.

### Runner Store
Store Pinia (`runnerStore`) yang menyimpan status test runner: `idle`, `running`, `done`, beserta log dan ringkasan hasil test.

### Report Viewer
Modal ringkasan visual hasil test yang muncul otomatis setelah run selesai. Menampilkan: pass rate (ring chart), breakdown hasil per Feature dan Test Case, serta statistik total. Bisa dibuka ulang via tombol Laporan di topbar.

### Browser Target
Browser yang dipilih untuk menjalankan test. Pilihan tersedia: Chrome, Firefox, Edge. Dipilih via `BrowserPicker` di topbar. Disimpan ke localStorage untuk persistence.

### Validate Run
Mode eksekusi test yang mensimulasikan run tanpa benar-benar membuka browser. Berguna untuk memeriksa apakah kode yang di-generate valid sebelum run sungguhan.

### Real Run
Mode eksekusi test yang menjalankan Mocha + Selenium WebDriver pada browser yang dipilih. Membutuhkan server aktif (`npm run dev`).

### Log Stream
Output real-time dari proses Mocha yang ditampilkan baris per baris di panel Test Runner saat test sedang berjalan.

### Mochawesome
Library reporter untuk Mocha yang menghasilkan laporan HTML interaktif. Digunakan oleh Please Blocks sebagai format laporan test.

---

## 9. Project & Workspace

### Project
Folder test yang dikelola IDE. Mengikuti struktur template `create-please-test`:

```
[nama-project]/
├── app.js          # Setup driver + instance please + import components
├── index.js        # Toggle feature mana yang dijalankan
├── .env            # Variabel environment
├── .env.example
├── components/     # Reusable action classes
├── data/           # Test data
│   └── main.js
├── feature/        # Spec files (output dari canvas)
└── .blocks/        # State canvas dalam JSON (source of truth)
```

### Project Gate
Layar awal yang muncul ketika IDE belum memiliki project yang aktif. Menawarkan dua pilihan: **New Project** (buat project baru di folder kosong) atau **Open Project** (buka folder project yang sudah ada). Canvas terkunci sampai project dipilih.

### Workspace
Folder project yang sedang aktif dikerjakan di IDE saat ini.

### Project Path
Path absolut ke folder project di disk. Disimpan ke `localStorage` agar workspace tetap terbuka saat IDE di-reload.

### `.blocks/`
Folder di dalam project yang menyimpan state canvas sebagai file JSON per feature (contoh: `login.json`, `checkout.json`). Ini adalah **source of truth** — bukan file `.spec.js`. File spec adalah output yang di-generate ulang dari `.blocks/`.

### Boot Sync
Proses yang berjalan saat IDE reload. IDE membandingkan state canvas di `localStorage` dengan file di disk (`.blocks/*.json`). Jika ada perbedaan, QA ditawarkan pilihan: muat dari disk atau pertahankan perubahan yang belum tersimpan.

### Dirty State
Kondisi di mana canvas sudah diubah sejak terakhir kali di-save ke disk. IDE menampilkan indikator untuk mengingatkan QA agar menyimpan perubahan.

### Save to Project
Operasi yang menulis seluruh state canvas ke file-file di folder project: spec files, data files, component files, index.js, dan `.blocks/*.json`.

### Save & Prune
Varian dari Save to Project yang juga menghapus file-file basi di disk — yaitu file spec/data/component yang sudah tidak ada di canvas (misalnya karena feature dihapus atau di-rename).

### Import by Project
Fitur yang membaca folder project existing di disk (`feature/*.spec.js`, `data/*.js`, `components/*.js`, `.env`, `index.js`) lalu merekonstruksi penuh canvas + Data Registry + Component Store. Urutan rekonstruksi: data → components → spec.

### Reverse Codegen Import
Fitur yang mem-parse satu file `.spec.js` secara manual (tempel teks atau pilih file) menjadi canvas nodes. Berbeda dari Import by Project yang membaca seluruh folder project.

---

## 10. Selector

### Selector
String yang digunakan untuk menemukan elemen HTML di halaman web. Please Blocks mendukung empat tipe selector:

| Tipe | Format | Contoh |
|---|---|---|
| CSS | `.class`, `#id`, `tag[attr]` | `#username`, `.btn-primary` |
| XPath | `//tag[@attr="val"]` | `//div[@id="error"]` |
| ID shorthand | `#id` | `#submit` |
| Link Text | `link=teks` | `link=Forgot Password` |

### Selector Inspector
UI khusus yang muncul di field selector pada Block Inspector. Fitur:
- Auto-detect tipe selector (XPath / CSS / ID / Link)
- Validasi syntax saat pengetikan
- Tombol copy selector ke clipboard
- Hint chips interaktif untuk memandu format
- Contoh format per tipe selector

### XPath
Selector yang menggunakan sintaks XML path untuk menemukan elemen. Dimulai dengan `//`. Cocok untuk kasus di mana elemen tidak memiliki ID atau class yang unik.

Contoh: `//button[contains(text(),'Login')]`

### CSS Selector
Selector yang menggunakan sintaks CSS. Lebih ringkas dari XPath untuk kasus umum.

Contoh: `button[type="submit"]`, `.error-message`, `input#username`

---

*Dokumen ini merupakan bagian dari panduan pengembangan Please Blocks IDE. Untuk roadmap dan keputusan arsitektur, lihat [RENCANA_PENGEMBANGAN.md](./RENCANA_PENGEMBANGAN.md).*
