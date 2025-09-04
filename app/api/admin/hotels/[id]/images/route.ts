import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// POST upload hotel images
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
    const images = formData.getAll('images') as File[];
    
    if (images.length === 0) {
      return NextResponse.json(
        { error: 'No images provided' },
        { status: 400 }
      );
    }

    const uploadedImages: string[] = [];
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'hotels', id);
    
    // Create upload directory if it doesn't exist
    await mkdir(uploadDir, { recursive: true });

    for (const image of images) {
      // Validate file type
      if (!image.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
        continue;
      }

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${timestamp}-${image.name}`;
      const filepath = path.join(uploadDir, filename);
      
      // Save file
      const buffer = Buffer.from(await image.arrayBuffer());
      await writeFile(filepath, buffer);
      
      // Store public URL
      uploadedImages.push(`/uploads/hotels/${id}/${filename}`);
    }

    // Update hotel with new images
    const hotel = await prisma.hotel.findUnique({
      where: { id }
    });

    if (!hotel) {
      return NextResponse.json(
        { error: 'Hotel not found' },
        { status: 404 }
      );
    }

    // Ensure images is an array
    const currentImages = Array.isArray(hotel.images) ? hotel.images : [];
    const newImages = [...currentImages, ...uploadedImages];

    const updatedHotel = await prisma.hotel.update({
      where: { id },
      data: {
        images: newImages
      }
    });

    return NextResponse.json({ 
      images: uploadedImages,
      total: Array.isArray(updatedHotel.images) ? updatedHotel.images.length : 0
    });
  } catch (error) {
    console.error('Error uploading images:', error);
    return NextResponse.json(
      { error: 'Failed to upload images' },
      { status: 500 }
    );
  }
}

// DELETE hotel image
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL required' },
        { status: 400 }
      );
    }

    const hotel = await prisma.hotel.findUnique({
      where: { id: params.id }
    });

    if (!hotel) {
      return NextResponse.json(
        { error: 'Hotel not found' },
        { status: 404 }
      );
    }

    // Remove image from array - ensure images is an array
    const currentImages = Array.isArray(hotel.images) ? hotel.images : [];
    const updatedImages = currentImages.filter((img: any) => img !== imageUrl);

    await prisma.hotel.update({
      where: { id: params.id },
      data: {
        images: updatedImages
      }
    });

    // Note: We're not deleting the physical file to avoid breaking any existing references
    // You could add file deletion logic here if needed

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}