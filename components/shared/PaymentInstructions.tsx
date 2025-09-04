import { useState } from "react"
import { Button } from "@/components/shared/button"
import { Copy, Check, CreditCard, AlertCircle, Clock, Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface PaymentInstructionsProps {
  reservationCode: string
  totalAmount: number
  currency?: "EUR" | "USD" | "GBP"
  holdExpiresAt: Date
  variant?: "full" | "compact" | "email"
  className?: string
}

interface BankDetails {
  bankName: string
  accountName: string
  accountNumber: string
  routingNumber?: string
  iban?: string
  swiftCode: string
  reference: string
}

export default function PaymentInstructions({
  reservationCode,
  totalAmount,
  currency = "EUR",
  holdExpiresAt,
  variant = "full",
  className
}: PaymentInstructionsProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const currencySymbols = {
    EUR: "€",
    USD: "$",
    GBP: "£"
  }

  const bankDetails: BankDetails = {
    bankName: "Travel Agency International Bank",
    accountName: "Travel Agency Ltd",
    accountNumber: "1234567890",
    iban: "GB29 NWBK 6016 1331 9268 19",
    swiftCode: "NWBKGB2L",
    reference: reservationCode
  }

  const timeRemaining = holdExpiresAt.getTime() - Date.now()
  const hoursRemaining = Math.max(0, Math.ceil(timeRemaining / (1000 * 60 * 60)))
  const minutesRemaining = Math.max(0, Math.ceil((timeRemaining % (1000 * 60 * 60)) / (1000 * 60)))

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => copyToClipboard(text, field)}
      className="h-auto p-1"
    >
      {copiedField === field ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  )

  // Email variant for email templates
  if (variant === "email") {
    return (
      <div className={cn("font-family: Arial, sans-serif;", className)}>
        <div style={{ backgroundColor: "#f8fafc", padding: "24px", borderRadius: "8px" }}>
          <h2 style={{ color: "#1e40af", marginBottom: "16px" }}>Payment Instructions</h2>
          
          <div style={{ backgroundColor: "#fee2e2", borderLeft: "4px solid #ef4444", padding: "16px", marginBottom: "16px" }}>
            <p style={{ margin: "0", color: "#dc2626", fontWeight: "600" }}>
              ⏰ Payment must be completed within {hoursRemaining} hours {minutesRemaining} minutes to secure your booking.
            </p>
          </div>

          <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "6px", marginBottom: "16px" }}>
            <h3 style={{ marginTop: "0", marginBottom: "16px", color: "#374151" }}>Wire Transfer Details</h3>
            
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tr>
                <td style={{ padding: "8px 0", fontWeight: "600", color: "#6b7280" }}>Bank Name:</td>
                <td style={{ padding: "8px 0", color: "#111827" }}>{bankDetails.bankName}</td>
              </tr>
              <tr>
                <td style={{ padding: "8px 0", fontWeight: "600", color: "#6b7280" }}>Account Name:</td>
                <td style={{ padding: "8px 0", color: "#111827" }}>{bankDetails.accountName}</td>
              </tr>
              <tr>
                <td style={{ padding: "8px 0", fontWeight: "600", color: "#6b7280" }}>IBAN:</td>
                <td style={{ padding: "8px 0", color: "#111827", fontFamily: "monospace" }}>{bankDetails.iban}</td>
              </tr>
              <tr>
                <td style={{ padding: "8px 0", fontWeight: "600", color: "#6b7280" }}>SWIFT Code:</td>
                <td style={{ padding: "8px 0", color: "#111827", fontFamily: "monospace" }}>{bankDetails.swiftCode}</td>
              </tr>
              <tr style={{ backgroundColor: "#fef3c7" }}>
                <td style={{ padding: "12px 8px", fontWeight: "700", color: "#92400e" }}>Payment Reference:</td>
                <td style={{ padding: "12px 8px", fontWeight: "700", color: "#92400e", fontFamily: "monospace" }}>{reservationCode}</td>
              </tr>
              <tr style={{ backgroundColor: "#dcfce7" }}>
                <td style={{ padding: "12px 8px", fontWeight: "700", color: "#166534" }}>Amount to Transfer:</td>
                <td style={{ padding: "12px 8px", fontWeight: "700", color: "#166534", fontSize: "18px" }}>
                  {currencySymbols[currency]}{totalAmount}
                </td>
              </tr>
            </table>
          </div>

          <div style={{ backgroundColor: "#dbeafe", padding: "16px", borderRadius: "6px" }}>
            <p style={{ margin: "0", color: "#1e40af", fontSize: "14px" }}>
              <strong>Important:</strong> Please include the payment reference <strong>{reservationCode}</strong> in your transfer to ensure prompt processing.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Compact variant
  if (variant === "compact") {
    return (
      <div className={cn("bg-blue-50 border border-blue-200 rounded-lg p-4", className)}>
        <div className="flex items-start space-x-3">
          <CreditCard className="h-5 w-5 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-800 mb-2">Wire Transfer Payment</h3>
            <p className="text-sm text-blue-700 mb-3">
              Complete your payment within <strong>{hoursRemaining}h {minutesRemaining}m</strong> to secure this booking.
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-600">Amount:</span>
                <span className="font-semibold text-blue-800">
                  {currencySymbols[currency]}{totalAmount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">Reference:</span>
                <span className="font-mono font-semibold text-blue-800">{reservationCode}</span>
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              Full payment details will be sent via email.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Full variant (default)
  return (
    <div className={cn("space-y-6", className)}>
      {/* Urgency Alert */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <Clock className="h-5 w-5 text-red-500" />
          <div>
            <h3 className="font-semibold text-red-800">Payment Required</h3>
            <p className="text-sm text-red-700">
              Complete payment within <strong>{hoursRemaining} hours {minutesRemaining} minutes</strong> to secure your booking.
              After this time, your reservation will be automatically cancelled.
            </p>
          </div>
        </div>
      </div>

      {/* Payment Amount */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold text-green-800 mb-2">Total Amount Due</h3>
        <div className="text-4xl font-bold text-green-600 mb-2">
          {currencySymbols[currency]}{totalAmount}
        </div>
        <p className="text-sm text-green-700">
          Reservation: <span className="font-mono font-semibold">{reservationCode}</span>
        </p>
      </div>

      {/* Wire Transfer Details */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <CreditCard className="h-6 w-6 text-blue-600" />
          <h3 className="text-xl font-semibold">Wire Transfer Details</h3>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Bank Name</label>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded border">
                <span className="text-gray-900">{bankDetails.bankName}</span>
                <CopyButton text={bankDetails.bankName} field="bankName" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Account Name</label>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded border">
                <span className="text-gray-900">{bankDetails.accountName}</span>
                <CopyButton text={bankDetails.accountName} field="accountName" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">IBAN</label>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded border">
                <span className="font-mono text-gray-900">{bankDetails.iban}</span>
                <CopyButton text={bankDetails.iban!} field="iban" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">SWIFT Code</label>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded border">
                <span className="font-mono text-gray-900">{bankDetails.swiftCode}</span>
                <CopyButton text={bankDetails.swiftCode} field="swiftCode" />
              </div>
            </div>
          </div>

          {/* Critical Information */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-800 mb-2">
                  Important: Payment Reference Required
                </h4>
                <div className="flex justify-between items-center p-3 bg-yellow-100 rounded border border-yellow-300">
                  <div>
                    <span className="text-sm text-yellow-700">Reference:</span>
                    <span className="ml-2 font-mono font-bold text-yellow-900 text-lg">
                      {reservationCode}
                    </span>
                  </div>
                  <CopyButton text={reservationCode} field="reference" />
                </div>
                <p className="text-sm text-yellow-700 mt-2">
                  You <strong>must</strong> include this reference number in your wire transfer 
                  to ensure your payment is processed correctly and quickly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-800 mb-2">Payment Processing Information</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Wire transfers typically take 1-3 business days to process</li>
              <li>• You will receive email confirmation once payment is received</li>
              <li>• Your booking will be automatically confirmed upon payment</li>
              <li>• Contact us at +1 (555) 123-4567 if you need assistance</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Download/Print Instructions */}
      <div className="flex justify-center space-x-4">
        <Button
          type="button"
          onClick={() => window.print()}
          variant="outline"
        >
          Print Instructions
        </Button>
        <Button
          type="button"
          onClick={() => copyToClipboard(
            `Bank: ${bankDetails.bankName}\nIBAN: ${bankDetails.iban}\nSWIFT: ${bankDetails.swiftCode}\nReference: ${reservationCode}\nAmount: ${currencySymbols[currency]}${totalAmount}`,
            "all"
          )}
        >
          Copy All Details
        </Button>
      </div>
    </div>
  )
}