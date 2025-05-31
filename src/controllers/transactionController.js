import prisma from '../config/prismaClient.js';
import { validationResult } from 'express-validator';

// Create a new transaction
export const createTransaction = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { userId, items, paymentMethod, shiftId } = req.body; // items: [{ menuId, quantity }]
    // Pemeriksaan manual sudah tidak diperlukan
    
    try {
        // Use Prisma transaction to ensure atomicity
        const result = await prisma.$transaction(async (tx) => {
            let totalAmount = 0;
            const transactionItemsData = [];

            for (const item of items) {
                const menu = await tx.menu.findUnique({
                    where: { id: parseInt(item.menuId) }, // Pastikan menuId adalah integer
                });

                if (!menu || menu.deletedAt) {
                    throw new Error(`Menu item with ID ${item.menuId} not found or unavailable.`);
                }
                
                const itemTotal = menu.price * item.quantity;
                totalAmount += itemTotal;

                transactionItemsData.push({
                    menuId: parseInt(item.menuId),
                    quantity: item.quantity,
                    priceAtTransaction: menu.price,
                });
            }

            const newTransaction = await tx.transaction.create({
                data: {
                    userId,
                    totalAmount: parseFloat(totalAmount.toFixed(2)), // Pastikan format float
                    paymentMethod,
                    shiftId: shiftId ? parseInt(shiftId) : undefined,
                    transactionItems: {
                        create: transactionItemsData,
                    },
                },
                include: {
                    transactionItems: { include: { menu: true } },
                    user: true,
                },
            });

            return newTransaction;
        });

        res.status(201).json(result);
    } catch (error) {
        console.error("Create transaction error:", error);
        // Check for specific error messages from the transaction block
        if (error.message.includes("Menu item with ID") || error.message.includes("Invalid input")) { // "Not enough stock" dihapus
            return res.status(400).json({ message: 'Gagal membuat transaksi', errors: [{ msg: error.message }] });
        }
        res.status(500).json({ message: 'Gagal membuat transaksi', errors: [{ msg: 'Terjadi kesalahan pada server.' }] });
    }
};

// Get all transactions
export const getAllTransactions = async (req, res) => {
    // TODO: Add pagination, filtering by date, user, etc.
    try {
        const transactions = await prisma.transaction.findMany({
            include: {
                user: { select: { id: true, name: true, email: true } },
                transactionItems: {
                    include: {
                        menu: { select: { id: true, name: true } }
                    }
                },
                shift: { select: { id: true, startTime: true, status: true } }
            },
            orderBy: {
                transactionDate: 'desc',
            },
        });
        res.json(transactions);
    } catch (error) {
        console.error("Get all transactions error:", error);
        res.status(500).json({ message: 'Gagal mengambil data transaksi', errors: [{ msg: 'Terjadi kesalahan pada server.' }] });
    }
};

// Note: GET /reports will be a separate controller or function
// For simplicity, I'll add a basic report function here, but it's better in its own controller.