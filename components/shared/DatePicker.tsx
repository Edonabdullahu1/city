"use client"

import { useState, useRef, useEffect } from "react"
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isBefore, isAfter } from "date-fns"
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/shared/button"
import { Input } from "@/components/shared/input"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  value?: Date
  onChange: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
  className?: string
  name?: string
  id?: string
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  disabled = false,
  minDate = new Date(),
  maxDate,
  className,
  name,
  id
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(value || new Date())
  const containerRef = useRef<HTMLDivElement>(null)

  // Close calendar when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  })

  const handleDateSelect = (date: Date) => {
    onChange(date)
    setIsOpen(false)
  }

  const isDateDisabled = (date: Date) => {
    if (minDate && isBefore(date, minDate)) return true
    if (maxDate && isAfter(date, maxDate)) return true
    return false
  }

  const navigateMonth = (direction: "prev" | "next") => {
    if (direction === "prev") {
      setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
    } else {
      setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
    }
  }

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      {/* Input Field */}
      <div className="relative">
        <Input
          type="text"
          value={value ? format(value, "MMM dd, yyyy") : ""}
          placeholder={placeholder}
          readOnly
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={cn(
            "cursor-pointer pr-10",
            disabled && "cursor-not-allowed"
          )}
          name={name}
          id={id}
        />
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
        >
          <Calendar className="h-4 w-4" />
        </button>
      </div>

      {/* Calendar Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-2 bg-white border rounded-lg shadow-lg p-4 min-w-[280px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth("prev")}
              className="p-1 h-auto"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <h3 className="font-semibold">
              {format(currentMonth, "MMMM yyyy")}
            </h3>
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth("next")}
              className="p-1 h-auto"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const isSelected = value && isSameDay(day, value)
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isTodayDate = isToday(day)
              const isDisabled = isDateDisabled(day)

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => !isDisabled && handleDateSelect(day)}
                  disabled={isDisabled}
                  className={cn(
                    "w-8 h-8 text-sm rounded-md transition-colors",
                    "hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500",
                    {
                      "text-muted-foreground": !isCurrentMonth,
                      "bg-blue-600 text-white hover:bg-blue-700": isSelected,
                      "bg-blue-100 text-blue-700": isTodayDate && !isSelected,
                      "opacity-50 cursor-not-allowed hover:bg-transparent": isDisabled,
                      "font-semibold": isTodayDate
                    }
                  )}
                >
                  {format(day, "d")}
                </button>
              )
            })}
          </div>

          {/* Today Button */}
          {!isDateDisabled(new Date()) && (
            <div className="mt-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleDateSelect(new Date())}
                className="w-full"
              >
                Today
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Date Range Picker Component
interface DateRangePickerProps {
  startDate?: Date
  endDate?: Date
  onStartDateChange: (date: Date | undefined) => void
  onEndDateChange: (date: Date | undefined) => void
  minDate?: Date
  maxDate?: Date
  className?: string
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  minDate = new Date(),
  maxDate,
  className
}: DateRangePickerProps) {
  // Auto-set minimum end date to start date
  const endMinDate = startDate ? addDays(startDate, 1) : minDate

  return (
    <div className={cn("grid grid-cols-2 gap-4", className)}>
      <div>
        <label className="block text-sm font-medium mb-2">Check-in Date</label>
        <DatePicker
          value={startDate}
          onChange={onStartDateChange}
          placeholder="Select check-in"
          minDate={minDate}
          maxDate={maxDate}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">Check-out Date</label>
        <DatePicker
          value={endDate}
          onChange={onEndDateChange}
          placeholder="Select check-out"
          minDate={endMinDate}
          maxDate={maxDate}
          disabled={!startDate}
        />
      </div>
    </div>
  )
}

// Quick date selector for common ranges
interface QuickDateSelectorProps {
  onDateSelect: (startDate: Date, endDate: Date) => void
  className?: string
}

export function QuickDateSelector({ onDateSelect, className }: QuickDateSelectorProps) {
  const quickOptions = [
    {
      label: "This Weekend",
      getValue: () => {
        const today = new Date()
        const daysUntilFriday = (5 - today.getDay() + 7) % 7 || 7
        const friday = addDays(today, daysUntilFriday)
        const sunday = addDays(friday, 2)
        return { start: friday, end: sunday }
      }
    },
    {
      label: "Next Week",
      getValue: () => {
        const today = new Date()
        const nextWeek = addDays(today, 7)
        return { start: nextWeek, end: addDays(nextWeek, 2) }
      }
    },
    {
      label: "Long Weekend",
      getValue: () => {
        const today = new Date()
        const start = addDays(today, 7)
        return { start, end: addDays(start, 3) }
      }
    }
  ]

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {quickOptions.map((option) => (
        <Button
          key={option.label}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const { start, end } = option.getValue()
            onDateSelect(start, end)
          }}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}