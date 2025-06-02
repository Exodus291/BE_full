import { validationResult } from 'express-validator';
import prisma from '../config/prismaClient.js';
// TransactionStatus akan secara otomatis dikenali oleh Prisma Client saat operasi,
// namun bisa diimpor jika diperlukan untuk logika eksplisit atau perbandingan:
// import { TransactionStatus } from '@prisma/client';

// Select clause untuk konsistensi data transaksi yang dikembalikan
const transactionSelect = {
    id: true,
    totalAmount: true,
    transactionDate: true,
    status: true,
    paymentMethod: true,
    storeId: true,
    shiftId: true,
    userId: true,
    user: { select: { id: true, name: true, email: true } },
    store: { select: { id: true, name: true } },
    shift: { select: { id: true, startTime: true, endTime: true } },
    transactionItems: {
        select: {
            id: true,
            menuId: true,
            quantity: true,
            customerName: true,
            customerNote: true,
            priceAtTransaction: true,
            menu: { select: { id: true, name: true } }
        }
    },
    createdAt: true,
    updatedAt: true,
};

export const createTransaction = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const {
        totalAmount,
        paymentMethod,
        status, // Jika dikirim, akan divalidasi. Jika tidak, default 'PENDING' dari skema akan digunakan.
        transactionItems, // Array of { menuId, quantity, priceAtTransaction, customerName?, customerNote? }
        shiftId
    } = req.body;

    const storeId = req.user.storeId; // Diambil dari token (authenticateToken middleware)
    const userId = req.user.id; // Staff yang memproses transaksi

    if (!storeId) {
        return res.status(400).json({ message: 'Gagal membuat transaksi', errors: [{ msg: 'Pengguna tidak terasosiasi dengan toko.' }] });
    }

    try {
        const newTransaction = await prisma.transaction.create({
            data: {
                totalAmount: parseFloat(totalAmount),
                userId,
                storeId,
                paymentMethod,
                shiftId: shiftId ? parseInt(shiftId) : null,
                // Jika 'status' tidak ada di req.body, Prisma akan menggunakan default 'PENDING'
                // Jika 'status' ada dan valid (misal "COMPLETED"), itu akan digunakan.
                ...(status && { status: status }), // Hanya tambahkan status jika ada di request
                transactionItems: {
                    create: transactionItems.map(item => ({
                        menuId: parseInt(item.menuId),
                        quantity: parseInt(item.quantity),
                        priceAtTransaction: parseFloat(item.priceAtTransaction),
                        ...(item.customerName && { customerName: item.customerName }),
                        ...(item.customerNote && { customerNote: item.customerNote }),
                    })),
                },
            },
            select: transactionSelect
        });
        res.status(201).json({ message: 'Transaksi berhasil dibuat', transaction: newTransaction });
    } catch (error) {
        console.error("Create transaction error:", error);
        // Handle error spesifik jika menu tidak ditemukan, dll.
        if (error.code === 'P2025') { // Foreign key constraint failed (e.g. menuId, shiftId, userId not found)
             return res.status(400).json({ message: 'Gagal membuat transaksi.', errors: [{msg: 'Data terkait (menu, shift, atau user) tidak ditemukan.'}] });
        }
        res.status(500).json({ message: 'Gagal membuat transaksi.', errors: [{ msg: 'Terjadi kesalahan pada server.' }] });
    }
};

export const getTransactionsForStore = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const storeId = req.user.storeId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (!storeId) {
        return res.status(400).json({ message: 'Pengguna tidak terasosiasi dengan toko.' });
    }

    try {
        const transactions = await prisma.transaction.findMany({
            where: {
                storeId: storeId,
            },
            select: transactionSelect,
            orderBy: {
                transactionDate: 'desc', // Urutkan berdasarkan tanggal transaksi terbaru
            },
            skip: skip,
            take: limit,
        });

        const totalTransactions = await prisma.transaction.count({
            where: {
                storeId: storeId,
            },
        });

        res.json({
            message: 'Data transaksi berhasil diambil.',
            transactions,
            currentPage: page,
            totalPages: Math.ceil(totalTransactions / limit),
            totalTransactions,
        });
    } catch (error) {
        console.error("Get transactions for store error:", error);
        res.status(500).json({ message: 'Gagal mengambil data transaksi.', errors: [{ msg: 'Terjadi kesalahan pada server.' }] });
    }
};

export const getTransactionById = async (req, res) => {
    const { transactionId } = req.params;
    const storeId = req.user.storeId;

    try {
        const transaction = await prisma.transaction.findFirst({
            where: {
                id: transactionId, // Tidak perlu parseInt lagi
                storeId: storeId, // Pastikan transaksi milik toko pengguna
            },
            select: transactionSelect
        });

        if (!transaction) {
            return res.status(404).json({ message: 'Transaksi tidak ditemukan atau Anda tidak berwenang.' });
        }
        res.json({ transaction });
    } catch (error) {
        console.error("Get transaction by ID error:", error);
        res.status(500).json({ message: 'Gagal mengambil data transaksi.', errors: [{ msg: 'Terjadi kesalahan pada server.' }] });
    }
};

export const updateTransactionStatus = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { transactionId } = req.params;
    const { status } = req.body; // Status baru yang sudah divalidasi
    const storeId = req.user.storeId;

    try {
        // Pertama, cek apakah transaksi ada dan milik toko yang benar
        const existingTransaction = await prisma.transaction.findFirst({
            where: { id: transactionId, storeId: storeId } // Tidak perlu parseInt
        });

        if (!existingTransaction) {
            return res.status(404).json({ message: 'Transaksi tidak ditemukan atau Anda tidak berwenang untuk mengubahnya.' });
        }

        // Lakukan update (where clause untuk update by ID tetap menggunakan ID)
        const updatedTransaction = await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                status: status, // Gunakan status yang sudah divalidasi
            },
            select: transactionSelect
        });
        res.json({ message: 'Status transaksi berhasil diperbarui.', transaction: updatedTransaction });
    } catch (error) {
        console.error("Update transaction status error:", error);
         if (error.code === 'P2025') { // Record to update not found (seharusnya sudah ditangani pengecekan di atas)
            return res.status(404).json({ message: 'Transaksi tidak ditemukan.' });
        }
        res.status(500).json({ message: 'Gagal memperbarui status transaksi.', errors: [{ msg: 'Terjadi kesalahan pada server.' }] });
    }
};

// Anda bisa menambahkan fungsi lain seperti getTransactionsForStore, dll.