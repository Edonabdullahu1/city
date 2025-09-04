'use client';

import React from 'react';
import { FiDownload, FiMail, FiPrinter } from 'react-icons/fi';

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  booking: {
    reservationCode: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    customerAddress?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  paymentStatus: 'PENDING' | 'PAID' | 'PARTIAL';
  notes?: string;
}

interface InvoiceGeneratorProps {
  invoiceData: InvoiceData;
  onDownload?: () => void;
  onEmail?: () => void;
  onPrint?: () => void;
}

export default function InvoiceGenerator({
  invoiceData,
  onDownload,
  onEmail,
  onPrint
}: InvoiceGeneratorProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: invoiceData.currency,
      minimumFractionDigits: 2
    }).format(amount / 100);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'PARTIAL':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg" id="invoice-content">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">INVOICE</h1>
              <p className="text-blue-100">Travel Agency Ltd</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{invoiceData.invoiceNumber}</p>
              <p className="text-blue-100 mt-1">{formatDate(invoiceData.invoiceDate)}</p>
            </div>
          </div>
        </div>

        {/* Company & Customer Info */}
        <div className="grid grid-cols-2 gap-8 p-8 border-b">
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">From</h3>
            <div className="text-gray-600">
              <p className="font-semibold">Travel Agency Ltd</p>
              <p>Rruga e Kavajës, Nr 59</p>
              <p>Tirana, Albania</p>
              <p>Tel: +355 4 123 4567</p>
              <p>Email: info@travelagency.com</p>
              <p>VAT: AL123456789</p>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Bill To</h3>
            <div className="text-gray-600">
              <p className="font-semibold">{invoiceData.booking.customerName}</p>
              <p>{invoiceData.booking.customerEmail}</p>
              {invoiceData.booking.customerPhone && (
                <p>{invoiceData.booking.customerPhone}</p>
              )}
              {invoiceData.booking.customerAddress && (
                <p>{invoiceData.booking.customerAddress}</p>
              )}
              <p className="mt-2">
                <span className="font-medium">Booking Ref:</span> {invoiceData.booking.reservationCode}
              </p>
            </div>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="p-8 border-b">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Invoice Date</p>
              <p className="font-semibold">{formatDate(invoiceData.invoiceDate)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Due Date</p>
              <p className="font-semibold">{formatDate(invoiceData.dueDate)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Payment Status</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(invoiceData.paymentStatus)}`}>
                {invoiceData.paymentStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="p-8">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 text-gray-700">Description</th>
                <th className="text-center py-3 text-gray-700">Qty</th>
                <th className="text-right py-3 text-gray-700">Unit Price</th>
                <th className="text-right py-3 text-gray-700">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoiceData.items.map((item, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-4 text-gray-600">{item.description}</td>
                  <td className="py-4 text-center text-gray-600">{item.quantity}</td>
                  <td className="py-4 text-right text-gray-600">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="py-4 text-right font-semibold text-gray-800">
                    {formatCurrency(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-8 border-t-2 pt-4">
            <div className="flex justify-end">
              <div className="w-64">
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">{formatCurrency(invoiceData.subtotal)}</span>
                </div>
                {invoiceData.tax > 0 && (
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Tax (20%)</span>
                    <span className="font-semibold">{formatCurrency(invoiceData.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between py-3 border-t-2 mt-2">
                  <span className="text-lg font-semibold text-gray-800">Total</span>
                  <span className="text-lg font-bold text-blue-600">
                    {formatCurrency(invoiceData.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoiceData.notes && (
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-700 mb-2">Notes</h4>
              <p className="text-sm text-gray-600">{invoiceData.notes}</p>
            </div>
          )}

          {/* Payment Instructions */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Payment Instructions</h4>
            <div className="text-sm text-blue-800 grid grid-cols-2 gap-4">
              <div>
                <p><strong>Bank Name:</strong> European Bank</p>
                <p><strong>Account Name:</strong> Travel Agency Ltd</p>
                <p><strong>IBAN:</strong> AL35202111090000000001234567</p>
              </div>
              <div>
                <p><strong>SWIFT Code:</strong> EUROBAAL</p>
                <p><strong>Reference:</strong> {invoiceData.booking.reservationCode}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-100 p-6 text-center text-sm text-gray-600">
          <p>Thank you for your business!</p>
          <p className="mt-2">
            Travel Agency Ltd | Rruga e Kavajës, Nr 59, Tirana, Albania | Tel: +355 4 123 4567
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex justify-center gap-4">
        <button
          onClick={onDownload}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <FiDownload /> Download PDF
        </button>
        <button
          onClick={onEmail}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <FiMail /> Send via Email
        </button>
        <button
          onClick={onPrint}
          className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          <FiPrinter /> Print Invoice
        </button>
      </div>
    </div>
  );
}