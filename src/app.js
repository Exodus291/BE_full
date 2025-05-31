import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser'; // Impor cookie-parser
import cors from 'cors'; // Impor paket cors

// Muat variabel lingkungan dari file .env
dotenv.config();

import authRoutes from './routes/authRoute.js';
import adminRoutes from './routes/adminRoute.js';
import staffRoutes from './routes/staffRoute.js';
import menuRoutes from './routes/menuRoutes.js';
import transactionRoutes from './routes/transactionRoute.js';
import reportRoutes from './routes/reportRoute.js';
import shiftRoutes from './routes/shiftRoute.js';
import categoryRoutes from './routes/categoryRoutes.js'; // Impor rute kategori
// import { cookie } from 'express-validator'; // Ini tidak digunakan untuk parsing cookie global, bisa dihapus jika tidak dipakai di tempat lain untuk validasi cookie secara spesifik

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware untuk CORS
// Ini akan mengizinkan semua origin secara default.
// Untuk konfigurasi lebih spesifik, lihat dokumentasi cors: https://www.npmjs.com/package/cors
// CORS Configuration
const corsOptions = {
    origin: 'http://localhost:3000', 
    credentials: true,
    optionsSuccessStatus: 200 
  };
  
  app.use(cors(corsOptions));
  // Middleware untuk parsing cookie
  app.use(cookieParser());

// Middleware untuk parsing JSON body
app.use(express.json());

// Menyajikan file statis dari direktori 'public' yang ada di root proyek
app.use(express.static(path.join(__dirname, '..', 'public')));
// Routes
app.use('/api/auth', authRoutes); // Rute untuk otentikasi (login, profile)
app.use('/api/admin', adminRoutes); // Rute khusus admin
app.use('/api/staff', staffRoutes); // Rute khusus staff (atau owner)
app.use('/api/menus', menuRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes); // Tambahkan rute untuk kategori
app.use('/api/reports', reportRoutes);
app.use('/api/shifts', shiftRoutes);

if (process.env.JWT_SECRET === 'your-default-very-strong-secret-key' || !process.env.JWT_SECRET) {
    console.warn("PERINGATAN: JWT_SECRET tidak disetel atau menggunakan nilai default. Harap set di file .env untuk produksi!");
}


// TODO: Tambahkan error handling middleware yang lebih baik

export default app;