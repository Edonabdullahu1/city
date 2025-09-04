import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBookingAuditHistory } from '@/lib/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || (session.user.role !== 'AGENT' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const auditHistory = await getBookingAuditHistory(params.bookingId);

    return NextResponse.json({
      success: true,
      auditHistory
    });

  } catch (error) {
    console.error('Error fetching audit history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit history' },
      { status: 500 }
    );
  }
}