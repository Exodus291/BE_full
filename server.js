import app from './src/app.js'; // Menggunakan ES Module import

const PORT = process.env.PORT || 3001; // Port bisa diambil dari .env

// Jalankan server
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});

// Jika Anda tidak ingin menggunakan ES Modules, server.js akan terlihat seperti:
// const app = require('./src/app');
// const PORT = process.env.PORT || 3001;
// app.listen(PORT, () => {
//    console.log(`Server berjalan di http://localhost:${PORT}`);
// });
