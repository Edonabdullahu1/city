'use client';

import React, { useState } from 'react';
import { FiCopy, FiCheck, FiInfo, FiClock } from 'react-icons/fi';

interface PaymentInstructionsProps {
  bookingId: string;
  reservationCode: string;
  totalAmount: number;
  currency?: string;
  dueDate?: Date;
}

export default function PaymentInstructions({
  bookingId,
  reservationCode,
  totalAmount,
  currency = 'EUR',
  dueDate
}: PaymentInstructionsProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const bankDetails = {
    accountName: 'Travel Agency Ltd',
    bankName: 'European Bank',
    iban: 'AL35202111090000000001234567',
    swiftCode: 'EUROBAAL',
    accountNumber: '0001234567',
    bankAddress: 'Rruga e Kavajës, Nr 59, Tirana, Albania',
    reference: reservationCode
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount / 100);
  };

  const calculateDaysUntilDue = () => {
    if (!dueDate) return null;
    const days = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const daysUntilDue = calculateDaysUntilDue();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6">
          <h2 className="text-2xl font-bold mb-2">Payment Instructions</h2>
          <p className="text-blue-100">
            Please complete the wire transfer using the details below
          </p>
        </div>

        {/* Amount Section */}
        <div className="bg-gray-50 border-b p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-600 mb-1">Amount Due</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatAmount(totalAmount)}
              </p>
            </div>
            {dueDate && (
              <div className="text-right">
                <p className="text-sm text-gray-600 mb-1">Payment Due</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(dueDate).toLocaleDateString()}
                </p>
                {daysUntilDue !== null && daysUntilDue >= 0 && (
                  <p className="text-sm text-orange-600 mt-1 flex items-center justify-end gap-1">
                    <FiClock />
                    {daysUntilDue === 0 ? 'Due today' : `${daysUntilDue} days remaining`}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bank Details */}
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Bank Transfer Details</h3>
          
          <div className="space-y-4">
            {/* Account Name */}
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Account Name</p>
                <p className="font-medium">{bankDetails.accountName}</p>
              </div>
              <button
                onClick={() => copyToClipboard(bankDetails.accountName, 'accountName')}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
              >
                {copiedField === 'accountName' ? (
                  <FiCheck className="text-green-600" />
                ) : (
                  <FiCopy className="text-gray-600" />
                )}
              </button>
            </div>

            {/* Bank Name */}
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Bank Name</p>
                <p className="font-medium">{bankDetails.bankName}</p>
              </div>
              <button
                onClick={() => copyToClipboard(bankDetails.bankName, 'bankName')}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
              >
                {copiedField === 'bankName' ? (
                  <FiCheck className="text-green-600" />
                ) : (
                  <FiCopy className="text-gray-600" />
                )}
              </button>
            </div>

            {/* IBAN */}
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="text-sm text-gray-600">IBAN</p>
                <p className="font-medium font-mono">{bankDetails.iban}</p>
              </div>
              <button
                onClick={() => copyToClipboard(bankDetails.iban, 'iban')}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
              >
                {copiedField === 'iban' ? (
                  <FiCheck className="text-green-600" />
                ) : (
                  <FiCopy className="text-gray-600" />
                )}
              </button>
            </div>

            {/* SWIFT Code */}
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="text-sm text-gray-600">SWIFT/BIC Code</p>
                <p className="font-medium">{bankDetails.swiftCode}</p>
              </div>
              <button
                onClick={() => copyToClipboard(bankDetails.swiftCode, 'swift')}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
              >
                {copiedField === 'swift' ? (
                  <FiCheck className="text-green-600" />
                ) : (
                  <FiCopy className="text-gray-600" />
                )}
              </button>
            </div>

            {/* Reference */}
            <div className="flex justify-between items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Payment Reference</p>
                <p className="font-medium text-lg">{bankDetails.reference}</p>
                <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                  <FiInfo size={12} />
                  Important: Include this reference with your payment
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(bankDetails.reference, 'reference')}
                className="p-2 hover:bg-yellow-100 rounded transition-colors"
              >
                {copiedField === 'reference' ? (
                  <FiCheck className="text-green-600" />
                ) : (
                  <FiCopy className="text-gray-600" />
                )}
              </button>
            </div>

            {/* Bank Address */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Bank Address</p>
              <p className="font-medium">{bankDetails.bankAddress}</p>
            </div>
          </div>

          {/* Important Notes */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Important Information</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Please ensure the payment reference is included</li>
              <li>• International transfer fees may apply</li>
              <li>• Payment confirmation will be sent within 24 hours</li>
              <li>• Contact us if you need assistance with payment</li>
            </ul>
          </div>

          {/* Contact Support */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-sm text-gray-600 mb-2">Need help with your payment?</p>
            <div className="flex justify-center gap-4">
              <a href="tel:+12345678900" className="text-blue-600 hover:underline">
                Call: +1 234 567 8900
              </a>
              <span className="text-gray-400">|</span>
              <a href="mailto:payments@travelagency.com" className="text-blue-600 hover:underline">
                Email: payments@travelagency.com
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-100 px-6 py-4">
          <div className="flex justify-between items-center">
            <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
              Download Instructions
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Send via Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}