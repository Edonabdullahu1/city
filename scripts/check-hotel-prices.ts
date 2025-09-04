import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const hotels = await prisma.hotel.findMany({
    where: { 
      name: { 
        contains: 'Malta'
      } 
    },
    select: { 
      name: true,
      hotelPrices: {
        select: {
          double: true,
          board: true,
          fromDate: true,
          tillDate: true
        }
      }
    }
  });
  
  console.log('Malta Hotels and Prices:');
  hotels.forEach(hotel => {
    console.log(`\n${hotel.name}:`);
    hotel.hotelPrices.forEach(price => {
      console.log(`  Double Room: €${price.double} (${price.board})`);
      console.log(`  Valid: ${price.fromDate} to ${price.tillDate}`);
    });
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());