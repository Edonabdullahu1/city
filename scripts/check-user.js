const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUser() {
  const user = await prisma.user.findUnique({
    where: { email: 'admin@travel-agency.com' }
  });
  
  if (user) {
    console.log('User found:', {
      email: user.email,
      role: user.role,
      hasPassword: !!user.password
    });
    
    const isValid = await bcrypt.compare('admin123', user.password);
    console.log('Password "admin123" is valid:', isValid);
  } else {
    console.log('User not found');
  }
  
  await prisma.$disconnect();
}

checkUser().catch(console.error);