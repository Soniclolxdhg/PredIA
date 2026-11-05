import { PrismaClient, RolUsuario } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando sembrado de datos (seed)...');

  // 1. Crear usuario Administrador inicial si no existe
  const adminEmail = 'admin@predia.cl';
  const adminExistente = await prisma.usuario.findUnique({
    where: { email: adminEmail },
  });

  if (!adminExistente) {
    const hashPassword = await argon2.hash('AdminPredIA2026!', {
      type: argon2.argon2id,
    });

    const admin = await prisma.usuario.create({
      data: {
        nombreCompleto: 'Administrador General',
        rut: '11.111.111-1',
        email: adminEmail,
        hashPassword,
        rol: RolUsuario.ADMINISTRADOR,
        activo: true,
      },
    });
    console.log(`✅ Usuario administrador creado: ${admin.email} (Password: AdminPredIA2026!)`);
  } else {
    console.log('ℹ️ El usuario administrador ya existe.');
  }

  console.log('✅ Sembrado de datos completado.');
}

main()
  .catch((e) => {
    console.error('❌ Error en el sembrado:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

