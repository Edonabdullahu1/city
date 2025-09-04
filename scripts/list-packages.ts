import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const packages = await prisma.package.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      active: true,
      basePrice: true
    }
  });
  
  console.log('All packages:');
  packages.forEach(pkg => {
    console.log(`- ${pkg.name} (${pkg.slug}) - Active: ${pkg.active}, Base Price: €${pkg.basePrice}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());