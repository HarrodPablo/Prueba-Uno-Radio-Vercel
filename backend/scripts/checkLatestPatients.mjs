import { prisma } from "../src/lib/prisma.js";

const users = await prisma.user.findMany({
  where: { role: "PATIENT" },
  orderBy: { createdAt: "desc" },
  take: 10,
  select: {
    id: true,
    dni: true,
    name: true,
    phone: true,
    email: true,
    role: true,
    createdAt: true,
  },
});

console.log(JSON.stringify(users, null, 2));

await prisma.$disconnect();

