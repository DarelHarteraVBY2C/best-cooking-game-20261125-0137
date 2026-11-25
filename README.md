# 🍳 Dapur Kilat — Warung Rush

![Bounty](https://make.fun/badge/best-cooking-game-20261125-0137.svg)
![Rank](https://make.fun/badge/best-cooking-game-20261125-0137/DarelHarteraVBY2C/best-cooking-game-20261125-0137/rank.svg)
![Reward](https://make.fun/badge/best-cooking-game-20261125-0137/DarelHarteraVBY2C/best-cooking-game-20261125-0137/reward.svg)

Game memasak serba cepat untuk bounty [Make the best cooking game](https://make.fun/c/best-cooking-game-20261125-0137). Kamu menjalankan sebuah warung: pesanan muncul di **Order Board**, bahan diambil dari **meja bahan**, dipotong di **talenan** atau dimasak di **kompor**, disusun di **piring**, lalu disajikan sebelum timer pesanan habis.

## Cara main

1. Pesanan muncul di Order Board — tiap pesanan punya batas waktu.
2. Klik bahan di meja bawah (atau tekan tombol `1`–`0`).
3. Bahan 🔪 dipotong otomatis di talenan, bahan 🔥 dimasak otomatis di kompor (maks 2).
4. Susun di piring sampai cocok dengan salah satu pesanan, lalu tekan **SAJIKAN** / `Enter`.
5. Pesanan hangus = kehilangan 1 hati (3 hati). Shift 3 menit — sajikan sebanyak mungkin!

**Kontrol:** mouse (klik semua) + keyboard `1`–`0` bahan, `Enter` sajikan, `Backspace` ambil 1 bahan dari piring, `T` buang piring, `P` jeda, `M` suara (mati dulu), `R` main lagi.

**Fitur:** 6 resep (terbuka bertahap per level), combo, bonus kecepatan, **Rush Hour** (30 detik terakhir: poin x2), 3 hati, papan menu, suara WebAudio opsional.

## Jalankan

```sh
node serve.ts   # lalu buka http://localhost:8080
```

Game 100% file statis, tanpa network request, tanpa aset eksternal — semua gambar digambar dengan kode canvas. Screenshot deterministik: `?shot=start`, `?shot=play`, `?shot=rush`, `?shot=end`.

## Struktur

- `game/index.html` + `game/style.css` — halaman game
- `game/src/main.js` — bootstrap, input, scene screenshot
- `game/src/game.js` — state, aturan main, dan gambar dapur
- `game/src/recipes.js` — data bahan & resep
- `game/src/draw.js` — semua gambar makanan (canvas murni)
- `game/src/audio.js` — bunyi WebAudio (mati secara default)
- `main.ts` — program hand-in (menyalin `game/` + `screenshots/` dan menulis `dossier.json`)

Lisensi: MIT.
