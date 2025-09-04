// WhatsApp notification service using n8n webhook
interface WhatsAppMessage {
  to: string;
  message: string;
  bookingCode?: string;
  type?: 'confirmation' | 'modification' | 'cancellation' | 'reminder';
}

export async function sendWhatsAppNotification(data: WhatsAppMessage) {
  try {
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.warn('N8N_WEBHOOK_URL not configured, skipping WhatsApp notification');
      return null;
    }

    // Format phone number (ensure it has country code)
    let phoneNumber = data.to.replace(/\D/g, '');
    if (!phoneNumber.startsWith('34')) {
      phoneNumber = '34' + phoneNumber; // Default to Spain if no country code
    }

    const payload = {
      phone: phoneNumber,
      message: data.message,
      bookingCode: data.bookingCode,
      type: data.type || 'notification',
      timestamp: new Date().toISOString()
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`n8n webhook failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('WhatsApp notification sent:', result);
    return result;

  } catch (error) {
    console.error('WhatsApp notification error:', error);
    // Don't throw - we don't want to fail operations if WhatsApp fails
    return null;
  }
}

// Pre-formatted message templates
export const whatsappTemplates = {
  bookingConfirmed: (code: string, destination: string, date: string) => 
    `✅ Your booking ${code} to ${destination} on ${date} has been confirmed! Check your email for travel documents.`,
  
  bookingModified: (code: string) => 
    `📝 Your booking ${code} has been modified. Please check your email for updated details.`,
  
  bookingCancelled: (code: string) => 
    `❌ Your booking ${code} has been cancelled. Contact us if you need assistance.`,
  
  paymentReminder: (code: string, amount: string, dueDate: string) => 
    `💳 Payment reminder for booking ${code}. Amount: €${amount} due by ${dueDate}.`,
  
  softBookingReminder: (code: string, expiresIn: string) => 
    `⏰ Your booking ${code} expires in ${expiresIn}. Complete payment to confirm your reservation.`,
  
  documentsReady: (code: string) => 
    `📄 Your travel documents for booking ${code} are ready! Check your email to download them.`,
  
  checkInReminder: (code: string, destination: string, date: string) => 
    `✈️ Reminder: Your trip to ${destination} (booking ${code}) is on ${date}. Safe travels!`
};

// Bulk WhatsApp notification for marketing (requires opt-in)
export async function sendBulkWhatsAppCampaign(
  recipients: string[],
  message: string,
  campaignType: 'promotion' | 'news' | 'reminder'
) {
  const results = [];
  
  // Send in batches to avoid overwhelming the webhook
  const batchSize = 10;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    
    const batchPromises = batch.map(phone => 
      sendWhatsAppNotification({
        to: phone,
        message,
        type: 'reminder'
      })
    );
    
    const batchResults = await Promise.allSettled(batchPromises);
    results.push(...batchResults);
    
    // Add delay between batches
    if (i + batchSize < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
    }
  }
  
  return results;
}