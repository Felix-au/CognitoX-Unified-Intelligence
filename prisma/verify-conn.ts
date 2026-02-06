import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Verifying MongoDB database connection using Prisma Client...");
  
  try {
    // Attempt to connect and fetch users list
    const userCount = await prisma.user.count();
    console.log(`Connection successful! Found ${userCount} user(s) in the database.`);
  } catch (error) {
    console.error("Database connection failed. Please verify your connection URI in .env:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
