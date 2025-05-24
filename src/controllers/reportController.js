import prisma from '../config/prismaClient.js';

// Get sales report (example: daily summary)
export const getSalesReport = async (req, res) => {
    const { date } = req.query; // Expects date in YYYY-MM-DD format

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
            },
            include: {
                transactionItems: true,
            },
        });

        let totalSales = 0;
        let totalItemsSold = 0;
        const menuSales = {};

        transactions.forEach(transaction => {
            totalSales += transaction.totalAmount;
            transaction.transactionItems.forEach(item => {
                totalItemsSold += item.quantity;
                menuSales[item.menuId] = (menuSales[item.menuId] || 0) + item.quantity;
            });
        });

        // You might want to fetch menu names for menuSales for better readability

        res.json({
            reportDate: startDate.toISOString().split('T')[0],
            totalTransactions: transactions.length,
            totalSales,
            totalItemsSold,
            // menuSales, // Consider enriching this with menu names
        });
    } catch (error) {
        console.error("Get sales report error:", error);
        res.status(500).json({ message: 'Failed to generate sales report' });
    }
};