const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createSampleTour() {
  console.log('Creating sample tours for Istanbul...\n');

  try {
    // Find Istanbul city
    const istanbul = await prisma.city.findFirst({
      where: { name: 'Istanbul' }
    });

    if (!istanbul) {
      console.error('Istanbul city not found');
      return;
    }

    // Create a sample excursion
    const excursion = await prisma.excursion.create({
      data: {
        title: 'Istanbul Highlights Tour',
        description: 'Explore the best of Istanbul including Hagia Sophia, Blue Mosque, Topkapi Palace, and Grand Bazaar. Full day guided tour with lunch included.',
        duration: 480, // 8 hours in minutes
        price: 75,
        capacity: 20,
        meetingPoint: 'Hotel lobby or Sultanahmet Square',
        includes: [
          'Professional guide',
          'Entrance fees to all monuments',
          'Traditional Turkish lunch',
          'Transportation by air-conditioned vehicle',
          'Hotel pick-up and drop-off'
        ],
        excludes: [
          'Personal expenses',
          'Drinks',
          'Tips and gratuities'
        ],
        images: [],
        active: true,
        cityId: istanbul.id
      }
    });

    console.log('Created excursion:');
    console.log(`  Title: ${excursion.title}`);
    console.log(`  Price: €${excursion.price}`);
    console.log(`  Duration: ${excursion.duration} minutes`);
    console.log(`  Capacity: ${excursion.capacity} people`);
    console.log(`  Active: ${excursion.active}`);

    // Create another excursion
    const bosphorus = await prisma.excursion.create({
      data: {
        title: 'Bosphorus Dinner Cruise',
        description: 'Enjoy a magical evening cruise along the Bosphorus with dinner and traditional entertainment. See Istanbul illuminated at night.',
        duration: 240, // 4 hours in minutes
        price: 65,
        capacity: 50,
        meetingPoint: 'Kabatas Pier or hotel pick-up',
        includes: [
          'Welcome cocktail',
          'Full dinner with Turkish cuisine',
          'Live folk show and belly dancing',
          'Unlimited soft drinks',
          'Hotel transfers'
        ],
        excludes: [
          'Alcoholic beverages',
          'Personal expenses',
          'Tips'
        ],
        images: [],
        active: true,
        cityId: istanbul.id
      }
    });

    console.log('\nCreated excursion:');
    console.log(`  Title: ${bosphorus.title}`);
    console.log(`  Price: €${bosphorus.price}`);
    console.log(`  Duration: ${bosphorus.duration} minutes`);
    console.log(`  Capacity: ${bosphorus.capacity} people`);
    console.log(`  Active: ${bosphorus.active}`);

    // Create a half-day tour
    const basilicaCistern = await prisma.excursion.create({
      data: {
        title: 'Basilica Cistern & Spice Bazaar Tour',
        description: 'Discover the underground Basilica Cistern and explore the colorful Spice Bazaar. Half-day walking tour with expert guide.',
        duration: 180, // 3 hours in minutes
        price: 45,
        capacity: 15,
        meetingPoint: 'Sultanahmet Square near the tram stop',
        includes: [
          'Professional licensed guide',
          'Basilica Cistern entrance fee',
          'Turkish tea or coffee',
          'Walking tour of Spice Bazaar'
        ],
        excludes: [
          'Hotel transfers',
          'Purchases at bazaar',
          'Meals',
          'Tips'
        ],
        images: [],
        active: true,
        cityId: istanbul.id
      }
    });

    console.log('\nCreated excursion:');
    console.log(`  Title: ${basilicaCistern.title}`);
    console.log(`  Price: €${basilicaCistern.price}`);
    console.log(`  Duration: ${basilicaCistern.duration} minutes`);
    console.log(`  Capacity: ${basilicaCistern.capacity} people`);
    console.log(`  Active: ${basilicaCistern.active}`);

  } catch (error) {
    console.error('Error creating tours:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSampleTour();