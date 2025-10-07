import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateName: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { templateName } = await params;

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const template = await prisma.emailTemplate.findUnique({
      where: { name: templateName },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error fetching email template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email template' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ templateName: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { templateName } = await params;

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subject, htmlContent, description, variables } = body;

    const template = await prisma.emailTemplate.upsert({
      where: { name: templateName },
      update: {
        subject,
        htmlContent,
        description,
        variables,
      },
      create: {
        name: templateName,
        subject,
        htmlContent,
        description,
        variables,
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error saving email template:', error);
    return NextResponse.json(
      { error: 'Failed to save email template' },
      { status: 500 }
    );
  }
}
