const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedDemoUsers() {
  console.log('Starting to seed demo users...');
  
  const demoUsers = [
    {
      email: 'admin@travel-agency.com',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      phone: '+1234567890'
    },
    {
      email: 'agent@travel-agency.com', 
      password: 'agent123',
      firstName: 'Agent',
      lastName: 'User',
      role: 'AGENT',
      phone: '+1234567891'
    },
    {
      email: 'user@example.com',
      password: 'user123',
      firstName: 'Demo',
      lastName: 'User', 
      role: 'USER',
      phone: '+1234567892'
    }
  ];

  for (const userData of demoUsers) {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        console.log(`User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create the user
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role as any
        }
      });

      console.log(`Created demo user: ${user.email} with role: ${user.role}`);
    } catch (error) {
      console.error(`Error creating user ${userData.email}:`, error);
    }
  }

  console.log('Demo users seeding completed!');
}

seedDemoUsers()
  .catch((e) => {
    console.error('Error seeding demo users:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });