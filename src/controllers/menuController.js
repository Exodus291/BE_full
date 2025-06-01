import prisma from '../config/prismaClient.js';
import { validationResult } from 'express-validator';

// Create a new menu item
export const createMenu = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, price, categoryId, imageUrl } = req.body;
    // Pemeriksaan manual sudah tidak diperlukan
    
    try {
        const newMenu = await prisma.menu.create({
            data: {
                name,
                price: parseFloat(price),
                categoryId: categoryId ? parseInt(categoryId) : undefined,
                imageUrl,
            },
            include: { category: true },
        });
        res.status(201).json(newMenu);
    } catch (error) {
        if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
            return res.status(409).json({ message: 'Gagal membuat menu', errors: [{ msg: 'Menu dengan nama ini sudah ada.' }] });
        }
        console.error("Create menu error:", error);
        res.status(500).json({ message: 'Gagal membuat menu', errors: [{ msg: 'Terjadi kesalahan pada server.' }] });
    }
};

// Get all menu items (excluding soft-deleted)
export const getAllMenus = async (req, res) => {
    try {
        const menus = await prisma.menu.findMany({
            where: {
                deletedAt: null, // Filter out soft-deleted items
            },
            include: { category: true },
            orderBy: { name: 'asc' }
        });
        res.json(menus);
    } catch (error) {
        console.error("Get all menus error:", error);
        res.status(500).json({ message: 'Gagal mengambil data menu', errors: [{ msg: 'Terjadi kesalahan pada server.' }] });
    }
};

// Get a single menu item by ID (excluding soft-deleted)
export const getMenuById = async (req, res) => {
    const { id } = req.params;
    try {
        const menu = await prisma.menu.findFirst({
            where: {
                id: parseInt(id),
                deletedAt: null,
            },
            include: { category: true },
        });
        if (!menu) {
            return res.status(404).json({ message: 'Menu tidak ditemukan', errors: [{ msg: 'Menu item tidak ditemukan.' }] });
        }
        res.json(menu);
    } catch (error) {
        console.error("Get menu by ID error:", error);
        res.status(500).json({ message: 'Gagal mengambil data menu', errors: [{ msg: 'Terjadi kesalahan pada server.' }] });
    }
};

// Search menu items by name query
export const searchMenus = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { q: searchQuery } = req.query; // Mengambil query 'q' dari URL, misalnya /menus/search?q=ayam

    try {
        const menus = await prisma.menu.findMany({
            where: {
                name: {
                    contains: searchQuery,
                    mode: 'insensitive', // Pencarian case-insensitive
                },
                deletedAt: null, // Hanya cari di menu yang belum di-soft-delete
            },
            include: {
                category: true, // Sertakan informasi kategori
            },
            orderBy: {
                name: 'asc', // Urutkan hasil berdasarkan nama
            },
        });

        if (menus.length === 0) {
            return res.status(404).json({ message: `Tidak ada menu yang ditemukan dengan query "${searchQuery}".`, data: [] });
        }

        res.json({ message: `Hasil pencarian untuk "${searchQuery}":`, data: menus });
    } catch (error) {
        console.error("Search menus error:", error);
        res.status(500).json({ message: 'Gagal melakukan pencarian menu', errors: [{ msg: 'Terjadi kesalahan pada server.' }] });
    }
};

// Update a menu item
export const updateMenu = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, price, categoryId, imageUrl } = req.body;


    try {
        // Pastikan menu yang akan diupdate ada dan belum di-soft-delete
        const existingMenu = await prisma.menu.findFirst({
            where: { id: parseInt(id), deletedAt: null }
        });

        if (!existingMenu) {
            return res.status(404).json({ message: 'Gagal memperbarui menu', errors: [{ msg: 'Menu item tidak ditemukan atau sudah dihapus.' }] });
        }
        
        const updatedMenu = await prisma.menu.update({
            where: { id: parseInt(id) },
            data: {
                name,
                price: price !== undefined ? parseFloat(price) : undefined,
                categoryId: categoryId !== undefined ? parseInt(categoryId) : undefined,
                imageUrl,
            },
            include: { category: true },
        });
        res.json(updatedMenu);
    } catch (error) {
        // P2025 adalah kode error Prisma jika record yang akan diupdate tidak ditemukan
        // Seharusnya sudah ditangani oleh pengecekan `existingMenu` di atas.
        if (error.code === 'P2025') { 
            return res.status(404).json({ message: 'Gagal memperbarui menu', errors: [{ msg: 'Menu item tidak ditemukan untuk diperbarui.' }] });
        }
        if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
            return res.status(409).json({ message: 'Gagal memperbarui menu', errors: [{ msg: 'Menu lain dengan nama ini sudah ada.' }] });
        }
        console.error("Update menu error:", error);
        res.status(500).json({ message: 'Gagal memperbarui menu', errors: [{ msg: 'Terjadi kesalahan pada server.' }] });
    }
};

// Soft delete a menu item
export const deleteMenu = async (req, res) => {
    const { id } = req.params;
    try {
        // Pastikan menu yang akan dihapus ada dan belum di-soft-delete
        const existingMenu = await prisma.menu.findFirst({
            where: { id: parseInt(id), deletedAt: null }
        });

        if (!existingMenu) {
            return res.status(404).json({ message: 'Gagal menghapus menu', errors: [{ msg: 'Menu item tidak ditemukan atau sudah dihapus.' }] });
        }

        await prisma.menu.update({
            where: { id: parseInt(id) },
            data: {
                deletedAt: new Date(),
            },
        });
        res.status(204).send(); // No content
    } catch (error) {
        // P2025 adalah kode error Prisma jika record yang akan didelete tidak ditemukan
        // Seharusnya sudah ditangani oleh pengecekan `existingMenu` di atas.
        if (error.code === 'P2025') { 
            return res.status(404).json({ message: 'Gagal menghapus menu', errors: [{ msg: 'Menu item tidak ditemukan untuk dihapus.' }] });
        }
        console.error("Delete menu error:", error);
        res.status(500).json({ message: 'Gagal menghapus menu', errors: [{ msg: 'Terjadi kesalahan pada server.' }] });
    }
};