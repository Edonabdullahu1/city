import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check the flights in the block
  const flights = await prisma.flight.findMany({
    where: { blockGroupId: 'BLOCK-1756989083186' },
    include: {
      originCity: true,
      destinationCity: true
    },
    orderBy: { departureTime: 'asc' }
  });
  
  console.log('=== FLIGHTS IN CHRONOLOGICAL ORDER ===');
  flights.forEach(f => {
    const date = new Date(f.departureTime);
    console.log(`${date.toDateString()} at ${date.toLocaleTimeString()} - ${f.flightNumber}:`);
    console.log(`  ${f.originCity.name} -> ${f.destinationCity.name}`);
    console.log(`  isReturn: ${f.isReturn}`);
  });
  
  // The correct order for a package TO Malta should be:
  // 1. First flight: Skopje -> Malta (outbound/departure)
  // 2. Second flight: Malta -> Skopje (return)
  
  const firstFlight = flights[0];  // May 17: Malta -> Skopje
  const secondFlight = flights[1]; // Oct 15: Skopje -> Malta
  
  console.log('\n=== ISSUE FOUND ===');
  console.log('For a package TO Malta, we need:');
  console.log('1. Outbound: Skopje -> Malta (should be FIRST in time)');
  console.log('2. Return: Malta -> Skopje (should be SECOND in time)');
  console.log('\nBut we have:');
  console.log('1. May 17: Malta -> Skopje (wrong direction for outbound!)');
  console.log('2. Oct 15: Skopje -> Malta (wrong direction for return!)');
  
  console.log('\n=== SOLUTION ===');
  console.log('The flights were created with wrong isReturn flags!');
  console.log('We need to fix the isReturn flags on these flights:');
  console.log(`- ${firstFlight.flightNumber} should have isReturn: true (it's the return flight)`);
  console.log(`- ${secondFlight.flightNumber} should have isReturn: false (it's the outbound flight)`);
  
  // Actually, wait - let me check if this is a package FROM Malta instead
  const pkg = await prisma.package.findFirst({
    where: { name: { contains: 'Malta' } },
    include: {
      city: true
    }
  });
  
  console.log('\n=== PACKAGE INFO ===');
  console.log('Package name:', pkg?.name);
  console.log('Destination city:', pkg?.city.name);
  
  if (pkg?.city.name === 'Malta') {
    console.log('\nThis is a package TO Malta, so:');
    console.log('- People should fly FROM their origin TO Malta first');
    console.log('- Then return FROM Malta back to origin');
    console.log('\nThe issue is the flight dates are backwards!');
    console.log('The October flight should be the outbound, and May should be the return.');
    
    // But that would mean traveling back in time...
    console.log('\nWait, this doesn\'t make sense chronologically...');
    console.log('You can\'t depart in October 2025 and return in May 2025!');
    console.log('\n=== REAL ISSUE ===');
    console.log('The flights were created with the wrong dates or wrong isReturn flags!');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());