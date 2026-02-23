import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.user.updateMany({
    where: { email: "maksim99437@gmail.com" },
    data: { isAdmin: true },
  });
  console.log(`Updated ${updated.count} user(s) as admin`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
