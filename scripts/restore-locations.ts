import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function restoreLocations() {
  try {
    // Check existing data
    const countriesCount = await prisma.country.count();
    const citiesCount = await prisma.city.count();
    
    console.log(`Current countries: ${countriesCount}`);
    console.log(`Current cities: ${citiesCount}`);
    
    if (countriesCount === 0) {
      console.log('Restoring countries and cities...');
      
      // Restore countries with cities
      const turkey = await prisma.country.create({
        data: {
          name: 'Turkey',
          code: 'TR',
          cities: {
            create: [
              { name: 'Istanbul' },
              { name: 'Ankara' },
              { name: 'Izmir' },
              { name: 'Antalya' },
              { name: 'Bodrum' }
            ]
          }
        }
      });
      
      const albania = await prisma.country.create({
        data: {
          name: 'Albania',
          code: 'AL',
          cities: {
            create: [
              { name: 'Tirana' },
              { name: 'Durres' },
              { name: 'Saranda' },
              { name: 'Vlora' },
              { name: 'Shkoder' }
            ]
          }
        }
      });
      
      const greece = await prisma.country.create({
        data: {
          name: 'Greece',
          code: 'GR',
          cities: {
            create: [
              { name: 'Athens' },
              { name: 'Thessaloniki' },
              { name: 'Mykonos' },
              { name: 'Santorini' },
              { name: 'Rhodes' }
            ]
          }
        }
      });
      
      const italy = await prisma.country.create({
        data: {
          name: 'Italy',
          code: 'IT',
          cities: {
            create: [
              { name: 'Rome' },
              { name: 'Milan' },
              { name: 'Venice' },
              { name: 'Florence' },
              { name: 'Naples' }
            ]
          }
        }
      });
      
      const spain = await prisma.country.create({
        data: {
          name: 'Spain',
          code: 'ES',
          cities: {
            create: [
              { name: 'Madrid' },
              { name: 'Barcelona' },
              { name: 'Valencia' },
              { name: 'Seville' },
              { name: 'Malaga' }
            ]
          }
        }
      });
      
      console.log('Countries and cities restored successfully!');
    }
    
    // Check airlines
    const airlinesCount = await prisma.airline.count();
    console.log(`Current airlines: ${airlinesCount}`);
    
    if (airlinesCount === 0) {
      console.log('Restoring airlines...');
      
      await prisma.airline.createMany({
        data: [
          { name: 'Turkish Airlines', iataCode: 'TK' },
          { name: 'Pegasus Airlines', iataCode: 'PC' },
          { name: 'Air Albania', iataCode: 'ZB' },
          { name: 'Albawings', iataCode: '2B' },
          { name: 'Aegean Airlines', iataCode: 'A3' }
        ]
      });
      
      console.log('Airlines restored successfully!');
    }
    
    // Check airports
    const airportsCount = await prisma.airport.count();
    console.log(`Current airports: ${airportsCount}`);
    
    if (airportsCount === 0) {
      console.log('Restoring airports...');
      
      // Get city IDs
      const istanbul = await prisma.city.findFirst({ where: { name: 'Istanbul' } });
      const tirana = await prisma.city.findFirst({ where: { name: 'Tirana' } });
      const athens = await prisma.city.findFirst({ where: { name: 'Athens' } });
      const rome = await prisma.city.findFirst({ where: { name: 'Rome' } });
      const madrid = await prisma.city.findFirst({ where: { name: 'Madrid' } });
      
      if (istanbul && tirana && athens && rome && madrid) {
        await prisma.airport.createMany({
          data: [
            { name: 'Istanbul Airport', code: 'IST', cityId: istanbul.id },
            { name: 'Sabiha Gokcen Airport', code: 'SAW', cityId: istanbul.id },
            { name: 'Tirana International Airport', code: 'TIA', cityId: tirana.id },
            { name: 'Athens International Airport', code: 'ATH', cityId: athens.id },
            { name: 'Rome Fiumicino Airport', code: 'FCO', cityId: rome.id },
            { name: 'Madrid Barajas Airport', code: 'MAD', cityId: madrid.id }
          ]
        });
        
        console.log('Airports restored successfully!');
      }
    }
    
    // Final counts
    const finalCountries = await prisma.country.count();
    const finalCities = await prisma.city.count();
    const finalAirlines = await prisma.airline.count();
    const finalAirports = await prisma.airport.count();
    
    console.log('\nFinal counts:');
    console.log(`Countries: ${finalCountries}`);
    console.log(`Cities: ${finalCities}`);
    console.log(`Airlines: ${finalAirlines}`);
    console.log(`Airports: ${finalAirports}`);
    
  } catch (error) {
    console.error('Error restoring data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreLocations();