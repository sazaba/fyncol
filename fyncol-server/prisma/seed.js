// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@fyncol.com';
  const passwordRaw = 'Fyncol2026'; // Tu contraseña real

  // 1. Encriptar contraseña
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(passwordRaw, salt);

  console.log(`🔐 Creando usuario admin para: ${email}`);

  // 2. Crear o actualizar usuario (Upsert)
  const user = await prisma.user.upsert({
    where: { email: email },
    update: {}, // Si existe, no hace nada
    create: {
      email: email,
      name: 'Dr. Jefferson Bastidas',
      password: hashedPassword, // Guardamos el HASH, no el texto plano
      role: 'admin',
    },
  });

  console.log('✅ Usuario creado:', user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });