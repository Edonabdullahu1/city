const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

function generateUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
  let slug = baseSlug;
  let counter = 1;
  
  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}

async function generateSlugs() {
  console.log('Starting slug generation...');

  try {
    // Generate slugs for cities
    console.log('\nGenerating slugs for cities...');
    const cities = await prisma.city.findMany({
      where: {
        slug: null
      }
    });

    const existingCitySlugs = await prisma.city.findMany({
      where: {
        slug: { not: null }
      },
      select: { slug: true }
    }).then((results: any[]) => results.map(r => r.slug!));

    for (const city of cities) {
      const baseSlug = generateSlug(city.name);
      const uniqueSlug = generateUniqueSlug(baseSlug, existingCitySlugs);
      
      await prisma.city.update({
        where: { id: city.id },
        data: { slug: uniqueSlug }
      });
      
      existingCitySlugs.push(uniqueSlug);
      console.log(`  ✓ ${city.name} -> ${uniqueSlug}`);
    }
    console.log(`Generated slugs for ${cities.length} cities`);

    // Generate slugs for hotels
    console.log('\nGenerating slugs for hotels...');
    const hotels = await prisma.hotel.findMany({
      where: {
        slug: null
      }
    });

    const existingHotelSlugs = await prisma.hotel.findMany({
      where: {
        slug: { not: null }
      },
      select: { slug: true }
    }).then((results: any[]) => results.map(r => r.slug!));

    for (const hotel of hotels) {
      const baseSlug = generateSlug(hotel.name);
      const uniqueSlug = generateUniqueSlug(baseSlug, existingHotelSlugs);
      
      await prisma.hotel.update({
        where: { id: hotel.id },
        data: { slug: uniqueSlug }
      });
      
      existingHotelSlugs.push(uniqueSlug);
      console.log(`  ✓ ${hotel.name} -> ${uniqueSlug}`);
    }
    console.log(`Generated slugs for ${hotels.length} hotels`);

    // Generate slugs for packages
    console.log('\nGenerating slugs for packages...');
    const packages = await prisma.package.findMany({
      where: {
        slug: null
      }
    });

    const existingPackageSlugs = await prisma.package.findMany({
      where: {
        slug: { not: null }
      },
      select: { slug: true }
    }).then((results: any[]) => results.map(r => r.slug!));

    for (const pkg of packages) {
      const baseSlug = generateSlug(pkg.name);
      const uniqueSlug = generateUniqueSlug(baseSlug, existingPackageSlugs);
      
      await prisma.package.update({
        where: { id: pkg.id },
        data: { slug: uniqueSlug }
      });
      
      existingPackageSlugs.push(uniqueSlug);
      console.log(`  ✓ ${pkg.name} -> ${uniqueSlug}`);
    }
    console.log(`Generated slugs for ${packages.length} packages`);

    console.log('\n✅ Slug generation completed successfully!');
  } catch (error) {
    console.error('Error generating slugs:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
generateSlugs();