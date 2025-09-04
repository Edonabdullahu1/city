import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const email = 'admin@travel-agency.com';
    const password = 'admin123';
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Check password
    const isValid = await bcrypt.compare(password, user.password);
    
    return NextResponse.json({
      userFound: true,
      email: user.email,
      role: user.role,
      passwordValid: isValid,
      hasPassword: !!user.password,
      passwordLength: user.password?.length
    });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}