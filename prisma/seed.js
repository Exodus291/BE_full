import { PrismaClient } from '@prisma/client'; // Using ES Module import
import bcrypt from 'bcryptjs';                 // Using ES Module import

const prisma = new PrismaClient(); // prismaClient is already default export

async function main() {
  console.log('Start seeding ...');
  const ownerPassword = await bcrypt.hash('ownerpass', 10);
  const staff1Password = await bcrypt.hash('staffpass1', 10);
  // const staff2Password = await bcrypt.hash('staffpass2', 10); // Jika Anda ingin staff kedua

  // 1. Create the Store first
  const store1 = await prisma.store.upsert({
    where: { name: 'Toko Sejahtera Jaya' },
    update: {},
    create: {
      name: 'Toko Sejahtera Jaya',
      // ownerId akan diisi setelah Owner dibuat dan dihubungkan
      // Untuk sementara, kita perlu cara untuk menghubungkannya.
      // Prisma memerlukan ownerId saat membuat Store jika relasinya non-opsional dari sisi Store.
      // Solusi: Buat Owner dulu, lalu Store, lalu update Owner dengan storeId.
      // Atau, buat Owner dan Store dalam satu transaksi jika memungkinkan dengan struktur Anda.
      // Mengikuti logika di authController, kita buat User (Owner) dan Store-nya bersamaan.
    },
  });
  console.log(`Store seeded: ${store1.name} (ID: ${store1.id})`);

  // 2. Create Owner and link to the Store
  const ownerReferralCode = 'OWNERREF123';
  const ownerUser = await prisma.user.upsert({
    where: { email: 'owner@example.com' },
    update: {}, // Bisa diupdate jika perlu, misal password atau referralCode
    create: {
      email: 'owner@example.com',
      name: 'Budi Owner',
      passwordHash: ownerPassword,
      role: 'OWNER',
      referralCode: ownerReferralCode,
      // Hubungkan sebagai pemilik toko
      ownedStore: {
        connect: { id: store1.id }
      },
      // Hubungkan sebagai anggota toko
      storeId: store1.id,
    },
    include: { ownedStore: true, store: true }
  });
  console.log(`Owner seeded: ${ownerUser.name} (ID: ${ownerUser.id}), Store ID: ${ownerUser.storeId}, Owns Store ID: ${ownerUser.ownedStore?.id}`);

  // Jika ownerId di Store belum terisi, update sekarang
  if (!store1.ownerId) {
    await prisma.store.update({
      where: { id: store1.id },
      data: { ownerId: ownerUser.id }
    });
    console.log(`Store ${store1.name} updated with ownerId: ${ownerUser.id}`);
  }

  // 3. Create Staff and link to the Owner's Store
  const staff1User = await prisma.user.upsert({
    where: { email: 'staff1@example.com' },
    update: {},
    create: {
      email: 'staff1@example.com',
      name: 'Citra Staff',
      passwordHash: staff1Password,
      role: 'STAFF',
      storeId: store1.id, // Staff bergabung dengan toko Owner
      referredByCode: ownerReferralCode,
      // referralCode: 'STAFFREF456' // Staff tidak lagi memiliki referral code
    },
  });
  console.log(`Staff seeded: ${staff1User.name} (ID: ${staff1User.id}), Store ID: ${staff1User.storeId}`);

  const beverageCategory = await prisma.category.upsert({
    where: { name_storeId: { name: 'Minuman Dingin', storeId: store1.id } },
    update: {},
    create: { name: 'Minuman Dingin', storeId: store1.id },
  });

  const foodCategory = await prisma.category.upsert({
    where: { name_storeId: { name: 'Makanan Utama', storeId: store1.id } },
    update: {},
    create: { name: 'Makanan Utama', storeId: store1.id },
  });
  console.log('Categories seeded.');

  await prisma.menu.createMany({
    data: [
      { name: 'Es Teh Manis', price: 5000, categoryId: beverageCategory.id, storeId: store1.id },
      { name: 'Kopi Susu Gula Aren', price: 18000, categoryId: beverageCategory.id, storeId: store1.id },
      { name: 'Nasi Goreng Spesial', price: 25000, categoryId: foodCategory.id, storeId: store1.id },
      { name: 'Mie Ayam Bakso', price: 20000, categoryId: foodCategory.id, storeId: store1.id },
    ],
    skipDuplicates: true,
  });
  console.log('Menus seeded.');

  console.log('Seeding finished.');
}
