import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check cities without slugs
  const citiesWithoutSlugs = await prisma.city.findMany({
    where: {
      OR: [
        { slug: null },
        { slug: '' }
      ]
    }
  });
  
  console.log(`Found ${citiesWithoutSlugs.length} cities without slugs`);
  
  for (const city of citiesWithoutSlugs) {
    // Create slug from name
    const slug = city.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    console.log(`Updating ${city.name} with slug: ${slug}`);
    
    await prisma.city.update({
      where: { id: city.id },
      data: { slug }
    });
  }
  
  console.log('\nAll cities after update:');
  const allCities = await prisma.city.findMany({
    select: { name: true, slug: true },
    orderBy: { name: 'asc' }
  });
  
  allCities.forEach(city => {
    console.log(`- ${city.name}: ${city.slug || 'NO SLUG'}`);
  });
  
  console.log('\nSlug generation complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());