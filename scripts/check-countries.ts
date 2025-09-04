import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const countries = await prisma.country.findMany({
    select: { id: true, name: true, code: true },
    orderBy: { name: 'asc' }
  });
  
  console.log(`Found ${countries.length} countries:`);
  console.log('========================');
  
  countries.forEach(country => {
    console.log(`${country.name} (${country.code}) - ID: ${country.id}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());