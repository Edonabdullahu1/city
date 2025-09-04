import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user if not exists
  const adminEmail = 'admin@mxitravel.com';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'MXi',
        role: 'ADMIN'
      }
    });
    console.log('✅ Created admin user:', admin.email);
  } else {
    console.log('ℹ️ Admin user already exists');
  }

  // Seed countries
  const countries = [
    { code: 'AL', name: 'Albania', currency: 'ALL' },
    { code: 'MK', name: 'Macedonia', currency: 'MKD' },
    { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
    { code: 'US', name: 'United States', currency: 'USD' },
    { code: 'FR', name: 'France', currency: 'EUR' },
    { code: 'DE', name: 'Germany', currency: 'EUR' },
    { code: 'IT', name: 'Italy', currency: 'EUR' },
    { code: 'ES', name: 'Spain', currency: 'EUR' },
    { code: 'GR', name: 'Greece', currency: 'EUR' },
    { code: 'TR', name: 'Turkey', currency: 'TRY' },
    { code: 'AE', name: 'United Arab Emirates', currency: 'AED' },
    { code: 'NL', name: 'Netherlands', currency: 'EUR' },
    { code: 'BE', name: 'Belgium', currency: 'EUR' },
    { code: 'CH', name: 'Switzerland', currency: 'CHF' },
    { code: 'AT', name: 'Austria', currency: 'EUR' },
    { code: 'CZ', name: 'Czech Republic', currency: 'CZK' },
    { code: 'PL', name: 'Poland', currency: 'PLN' },
    { code: 'PT', name: 'Portugal', currency: 'EUR' },
    { code: 'IE', name: 'Ireland', currency: 'EUR' },
    { code: 'SE', name: 'Sweden', currency: 'SEK' },
    { code: 'NO', name: 'Norway', currency: 'NOK' },
    { code: 'DK', name: 'Denmark', currency: 'DKK' },
    { code: 'FI', name: 'Finland', currency: 'EUR' },
    { code: 'HR', name: 'Croatia', currency: 'EUR' },
    { code: 'RS', name: 'Serbia', currency: 'RSD' },
    { code: 'BA', name: 'Bosnia and Herzegovina', currency: 'BAM' },
    { code: 'ME', name: 'Montenegro', currency: 'EUR' },
    { code: 'BG', name: 'Bulgaria', currency: 'BGN' },
    { code: 'RO', name: 'Romania', currency: 'RON' },
    { code: 'HU', name: 'Hungary', currency: 'HUF' }
  ];

  for (const country of countries) {
    const existing = await prisma.country.findUnique({
      where: { code: country.code }
    });

    if (!existing) {
      await prisma.country.create({
        data: {
          ...country,
          active: true
        }
      });
      console.log(`✅ Created country: ${country.name}`);
    }
  }

  console.log('ℹ️ Countries seed completed');

  // Seed popular cities with their airports
  const citiesWithAirports = [
    {
      country: 'AL',
      cities: [
        { name: 'Tirana', popular: true, airports: [{ code: 'TIA', name: 'Tirana International Airport' }] }
      ]
    },
    {
      country: 'MK',
      cities: [
        { name: 'Skopje', popular: true, airports: [{ code: 'SKP', name: 'Skopje International Airport' }] },
        { name: 'Ohrid', popular: false, airports: [{ code: 'OHD', name: 'Ohrid St. Paul Airport' }] }
      ]
    },
    {
      country: 'GB',
      cities: [
        { name: 'London', popular: true, airports: [
          { code: 'LHR', name: 'Heathrow Airport' },
          { code: 'LGW', name: 'Gatwick Airport' },
          { code: 'STN', name: 'Stansted Airport' },
          { code: 'LTN', name: 'Luton Airport' },
          { code: 'LCY', name: 'London City Airport' }
        ]},
        { name: 'Manchester', popular: true, airports: [{ code: 'MAN', name: 'Manchester Airport' }] },
        { name: 'Birmingham', popular: false, airports: [{ code: 'BHX', name: 'Birmingham Airport' }] },
        { name: 'Edinburgh', popular: true, airports: [{ code: 'EDI', name: 'Edinburgh Airport' }] }
      ]
    },
    {
      country: 'FR',
      cities: [
        { name: 'Paris', popular: true, airports: [
          { code: 'CDG', name: 'Charles de Gaulle Airport' },
          { code: 'ORY', name: 'Orly Airport' }
        ]},
        { name: 'Nice', popular: true, airports: [{ code: 'NCE', name: 'Nice Côte d\'Azur Airport' }] }
      ]
    },
    {
      country: 'IT',
      cities: [
        { name: 'Rome', popular: true, airports: [
          { code: 'FCO', name: 'Leonardo da Vinci Airport' },
          { code: 'CIA', name: 'Ciampino Airport' }
        ]},
        { name: 'Milan', popular: true, airports: [
          { code: 'MXP', name: 'Malpensa Airport' },
          { code: 'LIN', name: 'Linate Airport' }
        ]},
        { name: 'Venice', popular: true, airports: [{ code: 'VCE', name: 'Marco Polo Airport' }] }
      ]
    },
    {
      country: 'ES',
      cities: [
        { name: 'Barcelona', popular: true, airports: [{ code: 'BCN', name: 'El Prat Airport' }] },
        { name: 'Madrid', popular: true, airports: [{ code: 'MAD', name: 'Barajas Airport' }] }
      ]
    },
    {
      country: 'DE',
      cities: [
        { name: 'Berlin', popular: true, airports: [{ code: 'BER', name: 'Berlin Brandenburg Airport' }] },
        { name: 'Munich', popular: true, airports: [{ code: 'MUC', name: 'Munich Airport' }] },
        { name: 'Frankfurt', popular: false, airports: [{ code: 'FRA', name: 'Frankfurt Airport' }] }
      ]
    },
    {
      country: 'AE',
      cities: [
        { name: 'Dubai', popular: true, airports: [
          { code: 'DXB', name: 'Dubai International Airport' },
          { code: 'DWC', name: 'Al Maktoum International Airport' }
        ]}
      ]
    },
    {
      country: 'TR',
      cities: [
        { name: 'Istanbul', popular: true, airports: [
          { code: 'IST', name: 'Istanbul Airport' },
          { code: 'SAW', name: 'Sabiha Gökçen Airport' }
        ]}
      ]
    },
    {
      country: 'NL',
      cities: [
        { name: 'Amsterdam', popular: true, airports: [{ code: 'AMS', name: 'Schiphol Airport' }] }
      ]
    },
    {
      country: 'AT',
      cities: [
        { name: 'Vienna', popular: true, airports: [{ code: 'VIE', name: 'Vienna International Airport' }] }
      ]
    }
  ];

  for (const countryData of citiesWithAirports) {
    const country = await prisma.country.findUnique({
      where: { code: countryData.country }
    });

    if (!country) {
      console.log(`⚠️ Country not found: ${countryData.country}`);
      continue;
    }

    for (const cityData of countryData.cities) {
      let city = await prisma.city.findFirst({
        where: {
          name: cityData.name,
          countryId: country.id
        }
      });

      if (!city) {
        city = await prisma.city.create({
          data: {
            name: cityData.name,
            countryId: country.id,
            popular: cityData.popular,
            timezone: 'Europe/London', // Default timezone
            active: true
          }
        });
        console.log(`✅ Created city: ${cityData.name}, ${country.name}`);
      }

      // Add airports for this city
      for (const airportData of cityData.airports) {
        const existingAirport = await prisma.airport.findUnique({
          where: { code: airportData.code }
        });

        if (!existingAirport) {
          await prisma.airport.create({
            data: {
              code: airportData.code,
              name: airportData.name,
              cityId: city.id,
              active: true
            }
          });
          console.log(`✅ Created airport: ${airportData.code} - ${airportData.name}`);
        }
      }
    }
  }

  console.log('ℹ️ Cities and airports seed completed');

  // Create sample agent user if not exists
  const agentEmail = 'agent@mxitravel.com';
  const existingAgent = await prisma.user.findUnique({
    where: { email: agentEmail }
  });

  if (!existingAgent) {
    const hashedPassword = await bcrypt.hash('Agent123!', 10);
    const agent = await prisma.user.create({
      data: {
        email: agentEmail,
        password: hashedPassword,
        firstName: 'Agent',
        lastName: 'MXi',
        role: 'AGENT'
      }
    });
    console.log('✅ Created agent user:', agent.email);
  }

  // Create sample customer user if not exists
  const userEmail = 'user@example.com';
  const existingUser = await prisma.user.findUnique({
    where: { email: userEmail }
  });

  if (!existingUser) {
    const hashedPassword = await bcrypt.hash('User123!', 10);
    const user = await prisma.user.create({
      data: {
        email: userEmail,
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        role: 'USER'
      }
    });
    console.log('✅ Created sample user:', user.email);
  }

  console.log('✅ Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });