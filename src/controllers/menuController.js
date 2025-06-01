import prisma from '../config/prismaClient.js';
import { validationResult } from 'express-validator';

// Create a new menu item
export const createMenu = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, price, categoryId, imageUrl } = req.body;
    const storeId = req.user.storeId;

    if (!storeId) {
        return res.status(403).json({ message: 'Akses ditolak', errors: [{ msg: 'Pengguna tidak terkait dengan toko manapun.' }] });
    }

    try {
        // Jika categoryId diberikan, pastikan kategori tersebut ada dan milik toko yang sama
        if (categoryId) {
            const category = await prisma.category.findFirst({
                where: {
                    id: parseInt(categoryId),
                    storeId: storeId,
                    deletedAt: null,
                }
            });
            if (!category) {
                return res.status(400).json({ message: 'Gagal membuat menu', errors: [{ msg: 'Kategori tidak valid atau bukan milik toko Anda.' }] });
            }
        }

        const newMenu = await prisma.menu.create({
            data: {
                name,
                price: parseFloat(price),
                categoryId: categoryId ? parseInt(categoryId) : undefined,
                // imageUrl, // Akan dihandle jika ada upload file terpisah
                storeId: storeId,
            },
            include: { category: true },
        });
        res.status(201).json(newMenu);
    } catch (error) {
        // P2002 untuk @@unique([name, storeId])
        if (error.code === 'P2002' && error.meta?.target?.includes('name') && error.meta?.target?.includes('storeId')) {
            return res.status(409).json({ message: 'Gagal membuat menu', errors: [{ msg: 'Menu dengan nama ini sudah ada di toko Anda.' }] });
        }
        console.error("Create menu error:", error);
        res.status(500).json({ message: 'Gagal membuat menu', errors: [{ msg: 'Terjadi kesalahan pada server.' }] });
    }
};

// Get all menu items (excluding soft-deleted)
export const getAllMenus = async (req, res) => {
    const storeId = req.user.storeId;
    if (!storeId) {
        return res.status(403).json({ message: 'Akses ditolak', errors: [{ msg: 'Pengguna tidak terkait dengan toko manapun.' }] });
    }

    try {
        const menus = await prisma.menu.findMany({
            where: {
                deletedAt: null, // Filter out soft-deleted items
                storeId: storeId, // Filter berdasarkan toko pengguna
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
    const errors = validationResult(req); // Untuk validasi param 'id'
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { id } = req.params;
    const storeId = req.user.storeId;
    if (!storeId) {
        return res.status(403).json({ message: 'Akses ditolak', errors: [{ msg: 'Pengguna tidak terkait dengan toko manapun.' }] });
    }
    try {
        const menu = await prisma.menu.findFirst({
            where: {
                id: parseInt(id),
                deletedAt: null,
                storeId: storeId, // Pastikan menu milik toko pengguna
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
    const storeId = req.user.storeId;

    if (!storeId) {
        return res.status(403).json({ message: 'Akses ditolak', errors: [{ msg: 'Pengguna tidak terkait dengan toko manapun.' }] });
    }
    
    try {
        const menus = await prisma.menu.findMany({
            where: {
                name: {
                    contains: searchQuery,
                    mode: 'insensitive', // Pencarian case-insensitive
                },
                deletedAt: null, // Hanya cari di menu yang belum di-soft-delete
                storeId: storeId, // Filter berdasarkan toko pengguna
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
    const storeId = req.user.storeId;

    if (!storeId) {
        return res.status(403).json({ message: 'Akses ditolak', errors: [{ msg: 'Pengguna tidak terkait dengan toko manapun.' }] });
    }

    try {
        // Pastikan menu yang akan diupdate ada dan belum di-soft-delete
        const existingMenu = await prisma.menu.findFirst({
            where: { id: parseInt(id), deletedAt: null, storeId: storeId }
        });

        if (!existingMenu) {
            return res.status(404).json({ message: 'Gagal memperbarui menu', errors: [{ msg: 'Menu item tidak ditemukan atau sudah dihapus.' }] });
        }

        // Jika categoryId diberikan dan diubah, pastikan kategori baru tersebut ada dan milik toko yang sama
        if (categoryId !== undefined && existingMenu.categoryId !== parseInt(categoryId)) {
            if (categoryId === null) { // Mengizinkan untuk menghapus kategori dari menu
                // Tidak perlu validasi lebih lanjut jika categoryId di-set ke null
            } else {
                const category = await prisma.category.findFirst({
                    where: {
                        id: parseInt(categoryId),
                        storeId: storeId,
                        deletedAt: null,
                    }
                });
                if (!category) {
                    return res.status(400).json({ message: 'Gagal memperbarui menu', errors: [{ msg: 'Kategori baru tidak valid atau bukan milik toko Anda.' }] });
                }
            }
        }

        const updatedMenu = await prisma.menu.update({
            where: { id: parseInt(id) },
            data: {
                name,
                price: price !== undefined ? parseFloat(price) : undefined,
                categoryId: categoryId !== undefined ? (categoryId === null ? null : parseInt(categoryId)) : undefined,
                // imageUrl, // Akan dihandle jika ada upload file terpisah
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
        if (error.code === 'P2002' && error.meta?.target?.includes('name') && error.meta?.target?.includes('storeId')) {
            return res.status(409).json({ message: 'Gagal memperbarui menu', errors: [{ msg: 'Menu lain dengan nama ini sudah ada di toko Anda.' }] });
        }
        console.error("Update menu error:", error);
        res.status(500).json({ message: 'Gagal memperbarui menu', errors: [{ msg: 'Terjadi kesalahan pada server.' }] });
    }
};

// Soft delete a menu item
export const deleteMenu = async (req, res) => {
    const errors = validationResult(req); // Untuk validasi param 'id'
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { id } = req.params;
    const storeId = req.user.storeId;
    if (!storeId) {
        return res.status(403).json({ message: 'Akses ditolak', errors: [{ msg: 'Pengguna tidak terkait dengan toko manapun.' }] });
    }
    try {
        const existingMenu = await prisma.menu.findFirst({
            where: { id: parseInt(id), deletedAt: null, storeId: storeId }
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