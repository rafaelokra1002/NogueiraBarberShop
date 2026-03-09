import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Cria usuário admin padrão
  const hashedPassword = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@barberpro.com' },
    update: {},
    create: {
      email: 'admin@barberpro.com',
      password: hashedPassword,
      name: 'Administrador',
      role: 'ADMIN',
    },
  });

  // Cria/atualiza serviços padrões
  const rawServices = [
    {
      name: 'Degrade navalhado/Tesoura ',
      description: 'Corte moderno e estiloso',
      duration: 30,
      price: 30.0,
      isPopular: false,
    },
    {
      name: 'Cabelo social 1/2',
      description: 'Corte social clássico',
      duration: 30,
      price: 25.0,
      isPopular: true,
    },
    {
      name: 'Máquina 0/1',
      description: 'Corte rápido na máquina',
      duration: 25,
      price: 20.0,
      isPopular: true,
    },
    {
      name: 'Pigmentação',
      description: 'Aplicação de pigmento capilar/barba',
      duration: 30,
      price: 15.0,
      isPopular: false,
    },
    {
      name: 'Barba',
      description: 'Aparar e modelar a barba',
      duration: 30,
      price: 15.0,
      isPopular: true,
    },
    {
      name: 'Pé do cabelo',
      description: 'Acabamento na nuca',
      duration: 20,
      price: 10.0,
      isPopular: false,
    },
    {
      name: 'Sobrancelha',
      description: 'Aparar e modelar a sobrancelha',
      duration: 20,
      price: 10.0,
      isPopular: false,
    },
    {
      name: 'Platinado',
      description: 'Descoloração completa',
      duration: 60,
      price: 100.0,
      isPopular: false,
    },
    {
      name: 'Reflexo/luzes',
      description: 'Mechas e luzes',
      duration: 60,
      price: 100.0,
      isPopular: false,
    },
     {
      name: 'Cabelo Social 1/2',
      description: 'Mechas e luzes',
      duration: 30,
      price: 25.0,
      isPopular: false,
    },
  ];

  // Normaliza nomes/descriptions para evitar duplicidade por espaços
  const services = rawServices.map((s) => ({
    ...s,
    name: s.name.trim(),
    description: (s.description || '').trim() || null,
  }));

  // Upsert dos serviços desejados
  for (const service of services) {
    await prisma.service.upsert({
      where: { name: service.name },
      update: {
        description: service.description || undefined,
        duration: service.duration,
        price: service.price,
        isPopular: service.isPopular,
        isActive: true,
      },
      create: {
        ...service,
        isActive: true,
      },
    });
  }

  // Desativar serviços que NÃO estão na lista atual de seed
  const desiredNames = services.map((s) => s.name);
  await prisma.service.updateMany({
    where: { name: { notIn: desiredNames } },
    data: { isActive: false },
  });

  // Cria configurações de negócio padrão
  await prisma.businessSettings.upsert({
    where: { id: 'default' }, // Certifique-se que `id` é uma string definida manualmente no schema
    update: {},
    create: {
      id: 'default',
      businessName: 'BarberPro',
      businessAddress: 'Rua das Flores, 123 - Centro',
      businessPhone: '(11) 99999-9999',
      businessEmail: 'contato@barberpro.com',
    },
  });

  console.log('✅ Banco de dados populado/sincronizado com sucesso!');
  console.log('🔐 Credenciais do Admin:');
  console.log('Email: admin@barberpro.com');
  console.log('Senha: admin123');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
