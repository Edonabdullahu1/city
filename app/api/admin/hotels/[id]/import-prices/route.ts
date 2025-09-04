import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';

// POST import prices from Excel/CSV
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check if hotel exists
    const hotel = await prisma.hotel.findUnique({
      where: { id }
    });

    if (!hotel) {
      return NextResponse.json(
        { error: 'Hotel not found' },
        { status: 404 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let data: any[] = [];

    // Parse file based on extension
    const filename = file.name.toLowerCase();
    if (filename.endsWith('.csv')) {
      // Parse CSV
      const csvContent = buffer.toString('utf-8');
      data = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
    } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      // Parse Excel
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      data = XLSX.utils.sheet_to_json(worksheet);
    } else {
      return NextResponse.json(
        { error: 'Invalid file format. Please upload CSV or Excel file.' },
        { status: 400 }
      );
    }

    if (data.length === 0) {
      return NextResponse.json(
        { error: 'No data found in file' },
        { status: 400 }
      );
    }

    // Generate batch ID for this import
    const importBatchId = `import-${Date.now()}`;

    // Delete existing prices for this hotel (optional - or keep history)
    await prisma.hotelPrice.deleteMany({
      where: { hotelId: id }
    });

    // Expected columns: Board | Room Type | From Date | Till Date | Single | Double | Extra Bed | Paying Kids Age | Payment Kids
    const prices = data.map(row => {
      // Handle different possible column names
      const board = row['Board'] || row['board'] || 'RO';
      const roomType = row['Room Type'] || row['RoomType'] || row['room_type'] || 'Standard';
      const fromDate = parseDate(row['From Date'] || row['FromDate'] || row['from_date']);
      const tillDate = parseDate(row['Till Date'] || row['TillDate'] || row['till_date']);
      // Parse prices as floats (euros)
      const single = parseFloat(row['Single'] || row['single'] || '0');
      const double = parseFloat(row['Double'] || row['double'] || '0');
      const extraBed = parseFloat(row['Extra Bed'] || row['ExtraBed'] || row['extra_bed'] || '0');
      const payingKidsAge = row['Paying Kids Age'] || row['PayingKidsAge'] || row['paying_kids_age'] || '';
      const paymentKids = parseFloat(row['Payment Kids'] || row['PaymentKids'] || row['payment_kids'] || '0');

      return {
        hotelId: id,
        board: board.toUpperCase(),
        roomType,
        fromDate,
        tillDate,
        single,
        double,
        extraBed,
        payingKidsAge,
        paymentKids,
        importBatchId
      };
    });

    // Filter out invalid entries
    const validPrices = prices.filter(price => 
      price.fromDate && price.tillDate && 
      (price.single > 0 || price.double > 0)
    );

    if (validPrices.length === 0) {
      return NextResponse.json(
        { error: 'No valid price entries found in file' },
        { status: 400 }
      );
    }

    // Bulk create prices
    await prisma.hotelPrice.createMany({
      data: validPrices
    });

    // Fetch created prices
    const createdPrices = await prisma.hotelPrice.findMany({
      where: { 
        hotelId: id,
        importBatchId 
      },
      orderBy: {
        fromDate: 'asc'
      }
    });

    return NextResponse.json({ 
      count: createdPrices.length,
      prices: createdPrices,
      message: `Successfully imported ${createdPrices.length} price entries`
    });
  } catch (error) {
    console.error('Error importing prices:', error);
    return NextResponse.json(
      { error: 'Failed to import prices. Please check the file format.' },
      { status: 500 }
    );
  }
}

function parseDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  
  // Handle Excel serial date
  if (typeof dateValue === 'number') {
    // Excel stores dates as numbers (days since 1900-01-01)
    const excelEpoch = new Date(1900, 0, 1);
    const days = dateValue - 2; // Excel incorrectly considers 1900 a leap year
    const resultDate = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
    // Set to UTC noon to avoid timezone issues
    return new Date(Date.UTC(resultDate.getFullYear(), resultDate.getMonth(), resultDate.getDate(), 12, 0, 0));
  }
  
  // Handle string date
  if (typeof dateValue === 'string') {
    // Try DD/MM/YYYY format first (most common in Europe)
    const parts = dateValue.split(/[\/\-\.]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // JavaScript months are 0-indexed
      const year = parseInt(parts[2]);
      
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        // Use UTC to avoid timezone issues - set to noon UTC
        return new Date(Date.UTC(year, month, day, 12, 0, 0));
      }
    }
    
    // Try parsing as ISO date or other formats
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      // Normalize to UTC noon
      return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0));
    }
  }
  
  return null;
}