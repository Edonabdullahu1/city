import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting flight routes seed...');

  // First, ensure we have airlines
  const airlines = [
    { iataCode: 'W6', name: 'Wizz Air' },
    { iataCode: 'FR', name: 'Ryanair' },
    { iataCode: 'LH', name: 'Lufthansa' },
    { iataCode: 'OS', name: 'Austrian Airlines' },
    { iataCode: 'JU', name: 'Air Serbia' },
    { iataCode: 'A3', name: 'Aegean Airlines' },
    { iataCode: 'OU', name: 'Croatia Airlines' },
    { iataCode: 'U2', name: 'easyJet' }
  ];

  for (const airline of airlines) {
    await prisma.airline.upsert({
      where: { iataCode: airline.iataCode },
      update: {},
      create: airline
    });
  }

  console.log('✅ Airlines created');

  // Get airports for creating routes
  const airports = await prisma.airport.findMany({
    include: { city: true }
  });

  const airportMap = new Map();
  airports.forEach(ap => {
    airportMap.set(ap.code, ap);
  });

  // Create flight route templates (isBlockSeat = false means these are templates)
  const routes = [
    // From Skopje
    { from: 'SKP', to: 'IST', airline: 'W6', flightNumber: 'W6001' },
    { from: 'SKP', to: 'VIE', airline: 'OS', flightNumber: 'OS776' },
    { from: 'SKP', to: 'ZRH', airline: 'LH', flightNumber: 'LH2391' },
    { from: 'SKP', to: 'BCN', airline: 'W6', flightNumber: 'W6123' },
    { from: 'SKP', to: 'LGW', airline: 'W6', flightNumber: 'W6456' },
    { from: 'SKP', to: 'MXP', airline: 'W6', flightNumber: 'W6789' },
    // Return routes
    { from: 'IST', to: 'SKP', airline: 'W6', flightNumber: 'W6002' },
    { from: 'VIE', to: 'SKP', airline: 'OS', flightNumber: 'OS775' },
    { from: 'ZRH', to: 'SKP', airline: 'LH', flightNumber: 'LH2390' },
    { from: 'BCN', to: 'SKP', airline: 'W6', flightNumber: 'W6124' },
    { from: 'LGW', to: 'SKP', airline: 'W6', flightNumber: 'W6457' },
    { from: 'MXP', to: 'SKP', airline: 'W6', flightNumber: 'W6790' },
    // From Pristina
    { from: 'PRN', to: 'ZRH', airline: 'LH', flightNumber: 'LH1451' },
    { from: 'PRN', to: 'VIE', airline: 'OS', flightNumber: 'OS808' },
    { from: 'PRN', to: 'IST', airline: 'W6', flightNumber: 'W6301' },
    { from: 'ZRH', to: 'PRN', airline: 'LH', flightNumber: 'LH1450' },
    { from: 'VIE', to: 'PRN', airline: 'OS', flightNumber: 'OS807' },
    { from: 'IST', to: 'PRN', airline: 'W6', flightNumber: 'W6302' },
    // From Tirana
    { from: 'TIA', to: 'MXP', airline: 'FR', flightNumber: 'FR123' },
    { from: 'TIA', to: 'FCO', airline: 'FR', flightNumber: 'FR456' },
    { from: 'TIA', to: 'VIE', airline: 'OS', flightNumber: 'OS848' },
    { from: 'MXP', to: 'TIA', airline: 'FR', flightNumber: 'FR124' },
    { from: 'FCO', to: 'TIA', airline: 'FR', flightNumber: 'FR457' },
    { from: 'VIE', to: 'TIA', airline: 'OS', flightNumber: 'OS847' }
  ];

  for (const route of routes) {
    const fromAirport = airportMap.get(route.from);
    const toAirport = airportMap.get(route.to);
    
    if (fromAirport && toAirport) {
      const airline = await prisma.airline.findUnique({
        where: { iataCode: route.airline }
      });

      if (airline) {
        // Check if route already exists
        const existingRoute = await prisma.flight.findFirst({
          where: {
            flightNumber: route.flightNumber,
            departureAirportId: fromAirport.id,
            arrivalAirportId: toAirport.id,
            isBlockSeat: false
          }
        });

        if (!existingRoute) {
          await prisma.flight.create({
            data: {
              flightNumber: route.flightNumber,
              airlineId: airline.id,
              originCityId: fromAirport.cityId,
              destinationCityId: toAirport.cityId,
              departureAirportId: fromAirport.id,
              arrivalAirportId: toAirport.id,
              departureTime: new Date('2024-01-01T12:00:00Z'), // Placeholder time for templates
              arrivalTime: new Date('2024-01-01T14:00:00Z'),   // Placeholder time for templates
              totalSeats: 0,  // Templates don't have seats
              availableSeats: 0,
              pricePerSeat: 0,
              isBlockSeat: false // This marks it as a route template
            }
          });
          console.log(`✅ Created route: ${route.airline} ${route.flightNumber} - ${route.from} to ${route.to}`);
        } else {
          console.log(`ℹ️ Route already exists: ${route.airline} ${route.flightNumber}`);
        }
      }
    }
  }

  console.log('✅ Flight routes seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });