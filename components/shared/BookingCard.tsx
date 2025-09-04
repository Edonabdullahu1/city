import { format } from "date-fns"
import { Button } from "@/components/shared/button"
import { MapPin, Calendar, Users, Clock, CreditCard } from "lucide-react"
import Link from "next/link"

type BookingStatus = "soft" | "confirmed" | "paid" | "cancelled"

interface BookingCardProps {
  booking: {
    id: string
    reservationCode: string
    destination: string
    checkIn: Date
    checkOut: Date
    passengers: number
    totalAmount: number
    status: BookingStatus
    packageType: string
    createdAt: Date
    holdExpiresAt?: Date
  }
  variant?: "desktop" | "mobile"
}

const statusColors = {
  soft: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800"
}

const statusLabels = {
  soft: "Payment Pending",
  confirmed: "Confirmed",
  paid: "Paid",
  cancelled: "Cancelled"
}

export default function BookingCard({ booking, variant = "desktop" }: BookingCardProps) {
  const {
    id,
    reservationCode,
    destination,
    checkIn,
    checkOut,
    passengers,
    totalAmount,
    status,
    packageType,
    createdAt,
    holdExpiresAt
  } = booking

  const isExpiringSoon = holdExpiresAt && status === "soft" && new Date(holdExpiresAt).getTime() - Date.now() < 60 * 60 * 1000 // Less than 1 hour

  if (variant === "mobile") {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-lg">{destination}</h3>
            <p className="text-sm text-muted-foreground font-mono">{reservationCode}</p>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
            {statusLabels[status]}
          </span>
        </div>

        {/* Trip Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Check-in</p>
              <p className="font-medium">{format(checkIn, "MMM dd")}</p>
            </div>
          </div>
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Check-out</p>
              <p className="font-medium">{format(checkOut, "MMM dd")}</p>
            </div>
          </div>
          <div className="flex items-center">
            <Users className="h-4 w-4 mr-2 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Travelers</p>
              <p className="font-medium">{passengers} people</p>
            </div>
          </div>
          <div className="flex items-center">
            <CreditCard className="h-4 w-4 mr-2 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-medium text-green-600">€{totalAmount}</p>
            </div>
          </div>
        </div>

        {/* Package Info */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{packageType} Package</span>
          <span className="text-muted-foreground">
            Booked {format(createdAt, "MMM dd, yyyy")}
          </span>
        </div>

        {/* Expiry Warning */}
        {isExpiringSoon && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-red-500 mr-2" />
              <p className="text-sm text-red-700">
                <strong>Payment expires in {Math.ceil((holdExpiresAt!.getTime() - Date.now()) / (60 * 1000))} minutes</strong>
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2">
          <Link href={`/booking/${id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              View Details
            </Button>
          </Link>
          {status === "soft" && (
            <Button size="sm" className="flex-1">
              Complete Payment
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Desktop variant
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold mb-1">{destination}</h3>
          <p className="text-muted-foreground font-mono">{reservationCode}</p>
        </div>
        <div className="text-right">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[status]}`}>
            {statusLabels[status]}
          </span>
          <p className="text-2xl font-bold text-green-600 mt-2">€{totalAmount}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="flex items-center">
          <MapPin className="h-5 w-5 mr-3 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Destination</p>
            <p className="font-medium">{destination}</p>
          </div>
        </div>
        <div className="flex items-center">
          <Calendar className="h-5 w-5 mr-3 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Dates</p>
            <p className="font-medium">
              {format(checkIn, "MMM dd")} - {format(checkOut, "MMM dd")}
            </p>
          </div>
        </div>
        <div className="flex items-center">
          <Users className="h-5 w-5 mr-3 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Travelers</p>
            <p className="font-medium">{passengers} people</p>
          </div>
        </div>
        <div className="flex items-center">
          <div>
            <p className="text-sm text-muted-foreground">Package</p>
            <p className="font-medium">{packageType}</p>
          </div>
        </div>
      </div>

      {/* Expiry Warning */}
      {isExpiringSoon && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-red-500 mr-3" />
            <div>
              <p className="font-medium text-red-700">Payment Required Soon</p>
              <p className="text-sm text-red-600">
                Your booking hold expires in {Math.ceil((holdExpiresAt!.getTime() - Date.now()) / (60 * 1000))} minutes
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center pt-4 border-t">
        <p className="text-sm text-muted-foreground">
          Booked on {format(createdAt, "MMMM dd, yyyy")}
        </p>
        <div className="flex space-x-3">
          <Link href={`/booking/${id}`}>
            <Button variant="outline">View Details</Button>
          </Link>
          {status === "soft" && (
            <Button>Complete Payment</Button>
          )}
        </div>
      </div>
    </div>
  )
}