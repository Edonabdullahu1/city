import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing flight templates and blocks...');

  // Find all flights that are templates (no blockGroupId and placeholder dates)
  const templates = await prisma.flight.findMany({
    where: {
      blockGroupId: null,
      departureTime: new Date('2024-01-01T12:00:00Z')
    }
  });

  console.log(`Found ${templates.length} flight templates to fix`);

  // Update templates to have correct flags
  for (const template of templates) {
    await prisma.flight.update({
      where: { id: template.id },
      data: {
        isBlockSeat: false,
        totalSeats: 0,
        availableSeats: 0,
        pricePerSeat: 0
      }
    });
    console.log(`✅ Fixed template: ${template.flightNumber}`);
  }

  // Find all actual flight blocks (have real dates and seats)
  const blocks = await prisma.flight.findMany({
    where: {
      NOT: {
        departureTime: new Date('2024-01-01T12:00:00Z')
      },
      totalSeats: { gt: 0 }
    }
  });

  console.log(`Found ${blocks.length} flight blocks to ensure correct flags`);

  // Ensure blocks have correct flags
  for (const block of blocks) {
    if (!block.isBlockSeat) {
      await prisma.flight.update({
        where: { id: block.id },
        data: {
          isBlockSeat: true
        }
      });
      console.log(`✅ Fixed block: ${block.flightNumber}`);
    }
  }

  console.log('✅ Flight templates and blocks fixed!');
}

main()
  .catch((e) => {
    console.error('❌ Fix failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });