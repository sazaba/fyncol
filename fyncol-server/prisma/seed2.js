const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando el seeding para Fyncol...');

  const company2 = await prisma.company.create({
    data: {
      name: 'Segunda Empresa SaaS',
      email: 'contacto@empresa2.com',
      isActive: true,
      subscription: {
        create: {
          plan: 'PRO',
          status: 'ACTIVE',
          startDate: new Date(),
        },
      },
    },
  });
  console.log(`✅ Empresa creada: ${company2.name} (ID: ${company2.id})`);

  const admin2 = await prisma.user.create({
    data: {
      email: 'admin@empresa2.com',
      password: 'Admin123!', 
      name: 'Admin Empresa 2',
      role: 'ADMIN',
      document: '987654321',
      isActive: true,
      companyId: company2.id,
    },
  });
  console.log(`✅ Administrador creado: ${admin2.email}`);
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });