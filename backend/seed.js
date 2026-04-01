import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Creando usuarios de prueba...");

  // Crear médico
  const hashedPassword = await bcrypt.hash("12345678", 10);

  const doctor = await prisma.user.upsert({
    where: { dni: "753753" },
    update: {},
    create: {
      dni: "753753",
      name: "Dr. López",
      phone: "1198765432",
      email: "doctor@lopez.com",
      password: hashedPassword,
      role: "DOCTOR",
    },
  });

  // Crear paciente
  const patient = await prisma.user.upsert({
    where: { dni: "12345678" },
    update: {},
    create: {
      dni: "12345678",
      name: "Juan Pérez",
      phone: "1199999999",
      email: "juan.perez@test.com",
      password: hashedPassword,
      role: "PATIENT",
    },
  });

  // Crear administrador
  const admin = await prisma.user.upsert({
    where: { dni: "11111111" },
    update: {},
    create: {
      dni: "11111111",
      name: "Administrador",
      phone: "1188888888",
      email: "admin@test.com",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log("✅ Usuarios creados:");
  console.log("- Médico (DOCTOR): 753753 / 12345678");
  console.log("- Paciente (PATIENT): 12345678 / 12345678");
  console.log("- Admin (ADMIN): 11111111 / 12345678");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
