"use client"

import { useState } from "react"
import { Button } from "@/components/shared/button"
import { Input } from "@/components/shared/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/select"
import { Plus, Minus, User, Calendar, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"

export interface PassengerData {
  id: string
  title: string
  firstName: string
  lastName: string
  dateOfBirth: string
  nationality: string
  passportNumber?: string
  passportExpiry?: string
  isMainPassenger?: boolean
}

interface PassengerFormProps {
  passengers: PassengerData[]
  onPassengersChange: (passengers: PassengerData[]) => void
  maxPassengers?: number
  requirePassportInfo?: boolean
  variant?: "full" | "compact"
  className?: string
}

const titles = [
  { value: "mr", label: "Mr." },
  { value: "mrs", label: "Mrs." },
  { value: "ms", label: "Ms." },
  { value: "dr", label: "Dr." }
]

const nationalities = [
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "ES", label: "Spain" },
  { value: "IT", label: "Italy" },
  { value: "NL", label: "Netherlands" },
  { value: "AL", label: "Albania" },
  { value: "MK", label: "North Macedonia" },
  { value: "GR", label: "Greece" },
  { value: "RS", label: "Serbia" },
  { value: "ME", label: "Montenegro" }
]

export default function PassengerForm({
  passengers,
  onPassengersChange,
  maxPassengers = 8,
  requirePassportInfo = false,
  variant = "full",
  className
}: PassengerFormProps) {
  const [activePassengerIndex, setActivePassengerIndex] = useState(0)

  const createNewPassenger = (): PassengerData => ({
    id: `passenger_${Date.now()}_${Math.random()}`,
    title: "",
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    nationality: "",
    passportNumber: "",
    passportExpiry: "",
    isMainPassenger: passengers.length === 0
  })

  const addPassenger = () => {
    if (passengers.length < maxPassengers) {
      const newPassenger = createNewPassenger()
      onPassengersChange([...passengers, newPassenger])
      setActivePassengerIndex(passengers.length)
    }
  }

  const removePassenger = (index: number) => {
    if (passengers.length > 1) {
      const updatedPassengers = passengers.filter((_, i) => i !== index)
      // If we're removing the main passenger, make the first remaining one the main
      if (passengers[index].isMainPassenger && updatedPassengers.length > 0) {
        updatedPassengers[0].isMainPassenger = true
      }
      onPassengersChange(updatedPassengers)
      if (activePassengerIndex >= updatedPassengers.length) {
        setActivePassengerIndex(Math.max(0, updatedPassengers.length - 1))
      }
    }
  }

  const updatePassenger = (index: number, updates: Partial<PassengerData>) => {
    const updatedPassengers = passengers.map((passenger, i) => 
      i === index ? { ...passenger, ...updates } : passenger
    )
    onPassengersChange(updatedPassengers)
  }

  const setMainPassenger = (index: number) => {
    const updatedPassengers = passengers.map((passenger, i) => ({
      ...passenger,
      isMainPassenger: i === index
    }))
    onPassengersChange(updatedPassengers)
  }

  // Compact variant for smaller forms
  if (variant === "compact") {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Passengers ({passengers.length})</h3>
          {passengers.length < maxPassengers && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPassenger}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          )}
        </div>

        {passengers.map((passenger, index) => (
          <div key={passenger.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {passenger.isMainPassenger ? "Main Passenger" : `Passenger ${index + 1}`}
                </span>
              </div>
              {passengers.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removePassenger(index)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="First Name"
                value={passenger.firstName}
                onChange={(e) => updatePassenger(index, { firstName: e.target.value })}
              />
              <Input
                placeholder="Last Name"
                value={passenger.lastName}
                onChange={(e) => updatePassenger(index, { lastName: e.target.value })}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Full variant with all details
  return (
    <div className={cn("space-y-6", className)}>
      {/* Passenger Count Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold">Passenger Information</h3>
          <span className="text-sm text-muted-foreground">
            {passengers.length} of {maxPassengers} passengers
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => removePassenger(passengers.length - 1)}
            disabled={passengers.length <= 1}
          >
            <Minus className="h-4 w-4" />
          </Button>
          
          <span className="text-sm font-medium px-3">
            {passengers.length}
          </span>
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addPassenger}
            disabled={passengers.length >= maxPassengers}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Passenger Tabs */}
      {passengers.length > 1 && (
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {passengers.map((passenger, index) => (
            <button
              key={passenger.id}
              type="button"
              onClick={() => setActivePassengerIndex(index)}
              className={cn(
                "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors",
                activePassengerIndex === index
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {passenger.isMainPassenger ? "Main" : `Pass. ${index + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* Active Passenger Form */}
      {passengers[activePassengerIndex] && (
        <div className="border rounded-lg p-6 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold text-lg">
                {passengers[activePassengerIndex].isMainPassenger 
                  ? "Main Passenger" 
                  : `Passenger ${activePassengerIndex + 1}`}
              </h4>
              <p className="text-sm text-muted-foreground">
                {passengers[activePassengerIndex].isMainPassenger 
                  ? "Primary contact for this booking"
                  : "Additional traveler information"}
              </p>
            </div>
            
            {!passengers[activePassengerIndex].isMainPassenger && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMainPassenger(activePassengerIndex)}
              >
                Make Main
              </Button>
            )}
          </div>

          {/* Personal Information */}
          <div className="space-y-4">
            <h5 className="font-medium">Personal Information</h5>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                value={passengers[activePassengerIndex].title}
                onValueChange={(value) => updatePassenger(activePassengerIndex, { title: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Title" />
                </SelectTrigger>
                <SelectContent>
                  {titles.map((title) => (
                    <SelectItem key={title.value} value={title.value}>
                      {title.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="First Name *"
                value={passengers[activePassengerIndex].firstName}
                onChange={(e) => updatePassenger(activePassengerIndex, { firstName: e.target.value })}
                required
              />

              <Input
                placeholder="Last Name *"
                value={passengers[activePassengerIndex].lastName}
                onChange={(e) => updatePassenger(activePassengerIndex, { lastName: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Calendar className="inline h-4 w-4 mr-2" />
                  Date of Birth *
                </label>
                <Input
                  type="date"
                  value={passengers[activePassengerIndex].dateOfBirth}
                  onChange={(e) => updatePassenger(activePassengerIndex, { dateOfBirth: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  <MapPin className="inline h-4 w-4 mr-2" />
                  Nationality *
                </label>
                <Select
                  value={passengers[activePassengerIndex].nationality}
                  onValueChange={(value) => updatePassenger(activePassengerIndex, { nationality: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select nationality" />
                  </SelectTrigger>
                  <SelectContent>
                    {nationalities.map((country) => (
                      <SelectItem key={country.value} value={country.value}>
                        {country.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Passport Information */}
          {requirePassportInfo && (
            <div className="space-y-4">
              <h5 className="font-medium">Passport Information</h5>
              <p className="text-sm text-muted-foreground">
                Required for international travel. Passport must be valid for at least 6 months.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Passport Number"
                  value={passengers[activePassengerIndex].passportNumber || ""}
                  onChange={(e) => updatePassenger(activePassengerIndex, { passportNumber: e.target.value })}
                />

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Passport Expiry Date
                  </label>
                  <Input
                    type="date"
                    value={passengers[activePassengerIndex].passportExpiry || ""}
                    onChange={(e) => updatePassenger(activePassengerIndex, { passportExpiry: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Validation Summary */}
      <div className="text-sm text-muted-foreground">
        <p>* Required fields</p>
        {requirePassportInfo && (
          <p>Passport information is required for international bookings</p>
        )}
      </div>
    </div>
  )
}