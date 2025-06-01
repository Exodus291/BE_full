import prisma from '../config/prismaClient.js';

// Get sales report (example: daily summary)
export const getSalesReport = async (req, res) => {
    const { date } = req.query; // Expects date in YYYY-MM-DD format
    const storeId = req.user.storeId; // Diambil dari token JWT pengguna yang login
    const storeName = req.user.storeName;

    if (!storeId) {
        return res.status(403).json({ message: 'Akses ditolak', errors: [{ msg: 'Pengguna tidak terkait dengan toko manapun atau bukan Owner.' }] });
    }

    try {
        const targetDate = date ? new Date(date) : new Date();
        const startDate = new Date(targetDate.setHours(0, 0, 0, 0));
        const endDate = new Date(targetDate.setHours(23, 59, 59, 999));

        const transactions = await prisma.transaction.findMany({
            where: {
                transactionDate: {
                    gte: startDate,
                    lte: endDate,
                },
                storeId: storeId, // Filter transaksi berdasarkan toko
            },
            include: {
                transactionItems: {
                    include: { menu: { select: { name: true, id: true } } } // Sertakan nama menu
                },
            },
        });

        let totalSales = 0;
        let totalItemsSold = 0;
        const menuSales = {};

        transactions.forEach(trans => {
            totalSales += parseFloat(trans.totalAmount); // Pastikan ini adalah angka
            trans.transactionItems.forEach(item => {
                totalItemsSold += item.quantity;
                const menuIdentifier = item.menu.name || `Menu ID ${item.menuId}`; // Gunakan nama menu jika ada
                if (menuSales[menuIdentifier]) {
                    menuSales[menuIdentifier].quantity += item.quantity;
                    menuSales[menuIdentifier].totalValue += parseFloat(item.priceAtTransaction) * item.quantity;
                } else {
                    menuSales[menuIdentifier] = {
                        quantity: item.quantity,
                        totalValue: parseFloat(item.priceAtTransaction) * item.quantity,
                    };
                }
            });
        });

        res.json({
            storeName: storeName || "Toko Anda",
            reportDate: startDate.toISOString().split('T')[0],
            totalTransactions: transactions.length,
            totalSales: parseFloat(totalSales.toFixed(2)),
            totalItemsSold,
            menuSalesSummary: menuSales,
        });
    } catch (error) {
        console.error("Get sales report error:", error);
        res.status(500).json({ message: 'Gagal membuat laporan penjualan', errors: [{ msg: error.message }] });
    }
};