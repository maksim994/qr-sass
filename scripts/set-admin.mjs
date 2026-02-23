import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node set-admin.mjs <email>");
    console.error("Example: node set-admin.mjs admin@qr-s.ru");
    process.exit(1);
  }
  const updated = await prisma.user.updateMany({
    where: { email },
    data: { isAdmin: true },
  });
  console.log("Updated", updated.count, "user(s) to admin");
  if (updated.count === 0) {
    console.error("User not found. Register first via /register");
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
