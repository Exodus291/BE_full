import prisma from '../config/prismaClient.js';
import { ROLES } from '../config/constants.js';
import { validationResult } from 'express-validator';

// Start a new shift (Implicitly done when a user logs in, or explicitly if needed)
// For this example, we'll assume an explicit start, or that an open shift is required for transactions.
export const startShift = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { initialCash } = req.body;

    const openedByUserId = req.user.id; // From authenticateToken middleware

    try {
        // Check if there's already an open shift for this user or globally (depending on business logic)
        const existingOpenShift = await prisma.shift.findFirst({
            where: {
                status: 'OPEN',
                // openedByUserId: openedByUserId, // Uncomment if shifts are per-user
            }
        });

        if (existingOpenShift) {
            return res.status(409).json({ message: 'Gagal memulai shift', errors: [{ msg: 'Shift yang terbuka sudah ada. Harap tutup terlebih dahulu.' }], shift: existingOpenShift });
        }

        const newShift = await prisma.shift.create({
            data: {
                initialCash: initialCash ? parseFloat(initialCash) : 0,
                openedByUserId,
                status: 'OPEN',
            },
            include: { openedByUser: { select: { id: true, name: true } } }
        });
        res.status(201).json(newShift);
    } catch (error) {
        console.error("Start shift error:", error);
        res.status(500).json({ message: 'Gagal memulai shift', errors: [{ msg: 'Terjadi kesalahan pada server.' }] });
    }
};

// Get all shifts (or filter by status, user, etc.)
export const getAllShifts = async (req, res) => {
    try {
        const shifts = await prisma.shift.findMany({
            include: {
                openedByUser: { select: { id: true, name: true } },
                closedByUser: { select: { id: true, name: true } },
            },
            orderBy: { startTime: 'desc' },
        });
        res.json(shifts);
    } catch (error) {
        console.error("Get all shifts error:", error);
        res.status(500).json({ message: 'Gagal mengambil data shift', errors: [{ msg: 'Terjadi kesalahan pada server.' }] });
    }
};

// Close the current active shift
export const closeShift = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { shiftId } = req.params; // ID of the shift to close
    const { finalCash } = req.body;
    const closedByUserId = req.user.id; // From authenticateToken middleware

    
    try {
        const shiftToClose = await prisma.shift.findFirst({
            where: {
                id: parseInt(shiftId),
                status: 'OPEN',
            }
        });

        if (!shiftToClose) {
            return res.status(404).json({ message: 'Gagal menutup shift', errors: [{ msg: 'Shift yang terbuka tidak ditemukan atau sudah ditutup.' }] });
        }

        // Calculate total sales during this shift
        const transactionsInShift = await prisma.transaction.aggregate({
            _sum: { totalAmount: true },
            where: { shiftId: parseInt(shiftId) },
        });
        const totalSalesCalculated = transactionsInShift._sum.totalAmount || 0;

        const closedShift = await prisma.shift.update({
            where: { id: parseInt(shiftId) },
            data: {
                endTime: new Date(),
                finalCash: parseFloat(finalCash),
                totalSalesCalculated,
                status: 'CLOSED',
                closedByUserId,
            },
            include: { openedByUser: true, closedByUser: true, transactions: true }
        });
        res.json(closedShift);
    } catch (error) {
        console.error("Close shift error:", error);
        res.status(500).json({ message: 'Gagal menutup shift', errors: [{ msg: 'Terjadi kesalahan pada server.' }] });
    }
};