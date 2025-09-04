import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const pkg = await prisma.package.findUnique({
    where: { slug: 'cyprus-larnaca' },
    select: {
      id: true,
      name: true,
      slug: true,
      active: true,
      flightBlockIds: true,
      hotelIds: true
    }
  });
  
  console.log('Package:', pkg);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());