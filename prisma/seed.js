import { PrismaClient } from '@prisma/client'; // Using ES Module import
import bcrypt from 'bcryptjs';                 // Using ES Module import

const prisma = new PrismaClient(); // prismaClient is already default export

async function main() {
  console.log('Start seeding ...');
  const ownerPassword = await bcrypt.hash('ownerpass', 10);
  const staff1Password = await bcrypt.hash('staffpass1', 10);
  const staff2Password = await bcrypt.hash('staffpass2', 10);
  
  await prisma.user.createMany({
    data: [
      {
        email: 'owner@example.com',
        name: 'Owner', // Or your preferred name
        passwordHash: ownerPassword,
        role: 'OWNER',
      },
      {
        email: 'staff1@example.com',
        name: 'Staff', // Or your preferred name
        passwordHash: staff1Password,
        role: 'STAFF',
      },
      { email: 'staff2@example.com', name: 'Staff Junior', passwordHash: staff2Password, role: 'STAFF' }, // Or your preferred name
    ],
    skipDuplicates: true, // Abaikan jika email sudah ada
  });
  console.log('Users seeded.');

  const beverageCategory = await prisma.category.upsert({
    where: { name: 'Beverages' },
    update: {},
    create: { name: 'Beverages' },
  });

  const foodCategory = await prisma.category.upsert({
    where: { name: 'Main Course' },
    update: {},
    create: { name: 'Main Course' },
  });
  console.log('Categories seeded.');

  await prisma.menu.createMany({
    data: [
      { name: 'Espresso', price: 2.5, categoryId: beverageCategory.id },
      { name: 'Latte', price: 3.5, categoryId: beverageCategory.id },
      { name: 'Chicken Burger', price: 7.0, categoryId: foodCategory.id },
      { name: 'Pasta Carbonara', price: 9.0, categoryId: foodCategory.id },
    ],
    skipDuplicates: true,
  });
  console.log('Menus seeded.');

  console.log('Seeding finished.');
}
