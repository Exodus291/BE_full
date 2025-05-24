import express from 'express';
import dotenv from 'dotenv';

// Muat variabel lingkungan dari file .env
dotenv.config();

import authRoutes from './routes/authRoute.js';
import adminRoutes from './routes/adminRoute.js';
import staffRoutes from './routes/staffRoute.js';
import menuRoutes from './routes/menuRoutes.js';
import transactionRoutes from './routes/transactionRoute.js';
import reportRoutes from './routes/reportRoute.js';
import shiftRoutes from './routes/shiftRoute.js';


const app = express();

// Middleware untuk parsing JSON body
app.use(express.json());

if (process.env.JWT_SECRET === 'your-default-very-strong-secret-key') {
    console.warn("PERINGATAN: JWT_SECRET menggunakan nilai default. Harap set di file .env untuk produksi!");
}

// Routes
app.use('/api/auth', authRoutes); // Rute untuk otentikasi (login, profile)
app.use('/api/admin', adminRoutes); // Rute khusus admin
app.use('/api/staff', staffRoutes); // Rute khusus staff (atau owner)
app.use('/api/menus', menuRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/shifts', shiftRoutes);


// TODO: Tambahkan error handling middleware yang lebih baik

export default app;