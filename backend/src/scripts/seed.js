const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  // console.log("🚀 Inicializando base de datos Neon...");

  try {
    // Verificar si ya existen usuarios
    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      // console.log("✅ La base de datos ya tiene usuarios. No se necesita inicialización.");
      return;
    }

    // Crear usuarios iniciales
    const users = [
      {
        dni: "12345678",
        name: "Administrador",
        phone: "+5491112345678",
        email: "admin@portal.com",
        role: "ADMIN",
        password: await bcrypt.hash("12345678", 10),
      },
      {
        dni: "87654321",
        name: "Dr. Juan Pérez",
        phone: "+5491187654321",
        email: "doctor@portal.com",
        role: "DOCTOR",
        password: await bcrypt.hash("87654321", 10),
      },
      {
        dni: "11223344",
        name: "María García",
        phone: "+5491198765432",
        email: "paciente@portal.com",
        role: "PATIENT",
        password: await bcrypt.hash("11223344", 10),
      },
    ];

    // Insertar usuarios
    for (const userData of users) {
      await prisma.user.create({
        data: userData,
      });
      // console.log(`✅ Usuario creado: ${userData.name} (${userData.dni})`);
    }

    // console.log("🎯 ¡Base de datos inicializada correctamente!");
    // console.log("\n👤 USUARIOS INICIALES:");
    // console.log("👨‍⚕️  ADMIN - DNI: 12345678, Password: 12345678");
    // console.log("👨‍⚕️  DOCTOR - DNI: 87654321, Password: 87654321");
    // console.log("👤 PATIENT - DNI: 11223344, Password: 11223344");
  } catch (error) {
    console.error("❌ Error al inicializar la base de datos:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error("❌ Error al inicializar la base de datos:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
