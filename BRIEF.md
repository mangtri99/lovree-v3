halo claude

aku ingin membuat sebuah website Invitation Online
saat ini aku sudah punya website nya https://lovree.com/

berikut salah satu contoh tema nya https://lovree.com/invitation/dev?devSubdomain=demo-wedding&devTemplate=radiant-love

Aku pengen refactor website ini, yang sekarang menggunakan laravel, livewire, tailwind, dengan database mysql

Sedikit cerita nya untuk yang sekarang, customer menginput data diri di admin panel lalu memilih tema dan lagu, setelah itu sistem akan membuat subdomain untuk customer
Nah untuk yang baru ini aku ingin masih tetap sama dengan yang sekarang, namun ada fitur semacam website builder. jadi setelah undangannya selesai dibuat, customer bisa mengedit undangannya kayak Wix website
Soalnya sejauh ini problemnya susah buat dicustomize tampilannya. padahal customer pengen nya ada fitur A, B, C tapi kan ga semua tema ada, jadinya buat akalin kita ngerubah codenya dengan ngasi conditional hanya untuk customer tersebut
jadi lama lama kodenya makin berantakan dan gak teratur

Untuk yang sekarang ada 5 tipe undangan

1. Undangan Pernikahan
2. Undangan Pernikahan + Metatah/Mepandes
3. Undangan Metatah/Mepandes
4. Undangan Anak 3 Bulanan
5. Undangan Ulang Tahun

Secara garis besar structure layout dan Section Undangan seperti berikut
Ketika pertama kali buka

- Cover Berupa Modal Menutupi seluruh Layar (Berisi Title, nama pasangan, nama tamu) ada button buka undangan, pas di klik button buka undangan, nanti ada lagu yang diputar
- Saat cover ditutup, baru masuk ke halaman utama undangan

Struktur kurang lebih sebagai berikut setelah cover dibuka

- Hero (berisi judul, nama pasangan, tanggal)
- Salam Pembuka
- Ucapan Pembuka
- Foto Pasangan beserta data diri (nama, nama orang tua, anak keberepa, alamat, instagram)
- Detail Acara (Rangkaian Acara, Waktu, Tempat, Google Maps)
- countdown
- quote
- Love Gift
- Gallery (Bisa berupa carousel image/video)
- Ucapan Penutup
- Info Lebih Lanjut (No. Tlp, Social Media)
- Form Ucapan & Doa
- Daftar Tamu (Nama, Ucapan, Doa)
- Footer

Lebih Jelas bisa dilihat contohnya pada @contoh.png

Untuk Teknis pembuatan undagnan Secara alur nya seperti ini:

1. Admin panel, login → dashboard
2. Isi data diri pengantin, kalimat pembuka penutup, info acara, dll
3. Customer juga dapat mendaftarkan tamu undangan nya, atau bisa juga diisi nanti
4. Yang nantinya dapat dikirim ke tamu undangan via link undangan. linknya nanti isi query string ?guest=Nama+Tamu

Nah nanti aku pengennya untuk halaman seperti ini bisa di custom juga oleh admin, jadi dia bisa nambah field, hapus field, dan lain lain, dan disimpan ke database, terus nanti bisa diakses di frontend nya juga, soalnya nanti kan kita buat subdomain untuk setiap orderan, jadi nanti tampilannya bisa berbeda beda tergantung orderan nya.

Kira kira seperti itu, jadi tolong dibuatkan juga database nya

Untuk architecture nya bisa kamu bebas atur, pokoknya yang terbaik dan enak buat dikembangkan

Untuk yang baru ini aku pengen pake nuxt 4, tailwind, dan drizzle postgres neon

Coba kamu buatkan plan dan strateginya untuk membuat aplikasi ini
