import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@travel-agency.com' }
    });

    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@travel-agency.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
      }
    });

    console.log('Admin user created successfully:', {
      email: adminUser.email,
      role: adminUser.role,
      name: `${adminUser.firstName} ${adminUser.lastName}`
    });

    // Also create an agent and regular user for testing
    const agentUser = await prisma.user.create({
      data: {
        email: 'agent@travel-agency.com',
        password: hashedPassword,
        firstName: 'Agent',
        lastName: 'Smith',
        role: UserRole.AGENT,
      }
    });

    console.log('Agent user created:', agentUser.email);

    const regularUser = await prisma.user.create({
      data: {
        email: 'user@example.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.USER,
      }
    });

    console.log('Regular user created:', regularUser.email);
    
    console.log('\nAll users use password: admin123');

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();