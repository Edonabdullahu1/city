import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const cities = await prisma.city.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { 
      id: true, 
      name: true, 
      slug: true, 
      countryId: true, 
      createdAt: true 
    }
  });
  
  console.log('Recent cities (ordered by creation date):');
  console.log('==========================================');
  
  cities.forEach((city, index) => {
    console.log(`${index + 1}. ${city.name} (${city.countryId})`);
    console.log(`   Slug: ${city.slug || 'NOT SET'}`);
    console.log(`   Created: ${city.createdAt.toISOString()}`);
    console.log('');
  });
  
  const losAngeles = await prisma.city.findFirst({
    where: {
      OR: [
        { name: { contains: 'Los', mode: 'insensitive' } },
        { name: { contains: 'Angeles', mode: 'insensitive' } }
      ]
    }
  });
  
  if (losAngeles) {
    console.log('Found Los Angeles:');
    console.log(`Name: ${losAngeles.name}`);
    console.log(`Slug: ${losAngeles.slug}`);
    console.log(`Country ID: ${losAngeles.countryId}`);
  } else {
    console.log('Los Angeles not found in database');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());