import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find Cyprus package
  const cyprusPackage = await prisma.package.findFirst({
    where: {
      OR: [
        { name: { contains: 'Cyprus' } },
        { city: { name: 'Larnaca' } }
      ]
    },
    include: {
      city: true,
      departureFlight: true,
      returnFlight: true
    }
  });

  console.log('Cyprus Package:', {
    id: cyprusPackage?.id,
    name: cyprusPackage?.name,
    city: cyprusPackage?.city?.name,
    departureFlightId: cyprusPackage?.departureFlightId,
    returnFlightId: cyprusPackage?.returnFlightId,
    departureFlight: cyprusPackage?.departureFlight ? {
      id: cyprusPackage.departureFlight.id,
      flightNumber: cyprusPackage.departureFlight.flightNumber,
      route: `${cyprusPackage.departureFlight.departureAirportId} -> ${cyprusPackage.departureFlight.arrivalAirportId}`,
      date: cyprusPackage.departureFlight.departureTime
    } : null,
    returnFlight: cyprusPackage?.returnFlight ? {
      id: cyprusPackage.returnFlight.id,
      flightNumber: cyprusPackage.returnFlight.flightNumber,
      route: `${cyprusPackage.returnFlight.departureAirportId} -> ${cyprusPackage.returnFlight.arrivalAirportId}`,
      date: cyprusPackage.returnFlight.departureTime
    } : null
  });

  // Check all packages with their flight blocks
  const allPackages = await prisma.package.findMany({
    include: {
      city: true,
      departureFlight: true,
      returnFlight: true
    }
  });

  console.log('\nAll Packages and their Flights:');
  allPackages.forEach(pkg => {
    console.log({
      name: pkg.name,
      city: pkg.city.name,
      departureFlight: pkg.departureFlight?.flightNumber || 'Not set',
      returnFlight: pkg.returnFlight?.flightNumber || 'Not set'
    });
  });

  // Check flights with PC342/PC341
  const pcFlights = await prisma.flight.findMany({
    where: {
      OR: [
        { flightNumber: { contains: 'PC342' } },
        { flightNumber: { contains: 'PC341' } }
      ]
    },
    include: {
      departurePackages: true,
      returnPackages: true
    }
  });

  console.log('\nPC342/PC341 Flights:');
  pcFlights.forEach(flight => {
    console.log({
      id: flight.id,
      flightNumber: flight.flightNumber,
      route: `${flight.departureAirportId} -> ${flight.arrivalAirportId}`,
      usedAsDeparture: flight.departurePackages.map(p => p.name),
      usedAsReturn: flight.returnPackages.map(p => p.name)
    });
  });

  // Check W6 flights (Wizz Air - should be for Larnaca)
  const w6Flights = await prisma.flight.findMany({
    where: {
      flightNumber: { contains: 'W6' }
    },
    include: {
      departurePackages: true,
      returnPackages: true
    }
  });

  console.log('\nW6 (Wizz Air) Flights:');
  w6Flights.forEach(flight => {
    console.log({
      id: flight.id,
      flightNumber: flight.flightNumber,
      route: `${flight.departureAirportId} -> ${flight.arrivalAirportId}`,
      usedAsDeparture: flight.departurePackages.map(p => p.name),
      usedAsReturn: flight.returnPackages.map(p => p.name)
    });
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());