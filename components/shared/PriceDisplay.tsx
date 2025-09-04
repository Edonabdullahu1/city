import { cn } from "@/lib/utils"

interface PriceDisplayProps {
  amount: number
  currency?: "EUR" | "USD" | "GBP"
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "default" | "success" | "muted" | "accent"
  showCurrency?: boolean
  className?: string
  prefix?: string
  suffix?: string
}

const currencySymbols = {
  EUR: "€",
  USD: "$",
  GBP: "£"
}

const sizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-2xl"
}

const variantClasses = {
  default: "text-foreground",
  success: "text-green-600",
  muted: "text-muted-foreground",
  accent: "text-blue-600"
}

export default function PriceDisplay({ 
  amount, 
  currency = "EUR", 
  size = "md", 
  variant = "default",
  showCurrency = true,
  className,
  prefix,
  suffix
}: PriceDisplayProps) {
  const formatPrice = (price: number, curr: string) => {
    // Format number with proper decimal places and thousand separators
    const formattedNumber = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price)
    
    if (!showCurrency) return formattedNumber
    
    // Return formatted price with currency symbol
    return `${currencySymbols[curr as keyof typeof currencySymbols]}${formattedNumber}`
  }

  return (
    <span 
      className={cn(
        "font-semibold",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      {prefix && <span className="mr-1">{prefix}</span>}
      {formatPrice(amount, currency)}
      {suffix && <span className="ml-1">{suffix}</span>}
    </span>
  )
}

// Export convenience components for common use cases
export function PriceLarge({ amount, ...props }: Omit<PriceDisplayProps, 'size'>) {
  return <PriceDisplay amount={amount} size="xl" {...props} />
}

export function PriceSmall({ amount, ...props }: Omit<PriceDisplayProps, 'size'>) {
  return <PriceDisplay amount={amount} size="sm" {...props} />
}

export function PriceSuccess({ amount, ...props }: Omit<PriceDisplayProps, 'variant'>) {
  return <PriceDisplay amount={amount} variant="success" {...props} />
}

export function PriceMuted({ amount, ...props }: Omit<PriceDisplayProps, 'variant'>) {
  return <PriceDisplay amount={amount} variant="muted" {...props} />
}

// Price breakdown component for detailed pricing displays
interface PriceBreakdownProps {
  items: Array<{
    label: string
    amount: number
    currency?: "EUR" | "USD" | "GBP"
    isTotal?: boolean
  }>
  className?: string
}

export function PriceBreakdown({ items, className }: PriceBreakdownProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {items.map((item, index) => (
        <div key={index} className={cn(
          "flex justify-between items-center",
          item.isTotal && "pt-2 border-t font-semibold"
        )}>
          <span className={cn(
            item.isTotal ? "text-foreground" : "text-muted-foreground"
          )}>
            {item.label}
          </span>
          <PriceDisplay 
            amount={item.amount} 
            currency={item.currency}
            size={item.isTotal ? "lg" : "md"}
            variant={item.isTotal ? "success" : "default"}
          />
        </div>
      ))}
    </div>
  )
}

// Price comparison component
interface PriceComparisonProps {
  originalPrice: number
  currentPrice: number
  currency?: "EUR" | "USD" | "GBP"
  size?: "sm" | "md" | "lg"
  className?: string
}

export function PriceComparison({ 
  originalPrice, 
  currentPrice, 
  currency = "EUR", 
  size = "md",
  className 
}: PriceComparisonProps) {
  const savings = originalPrice - currentPrice
  const savingsPercentage = Math.round((savings / originalPrice) * 100)

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <PriceDisplay 
        amount={currentPrice} 
        currency={currency} 
        size={size}
        variant="success"
      />
      {savings > 0 && (
        <>
          <PriceDisplay 
            amount={originalPrice} 
            currency={currency} 
            size={size}
            variant="muted"
            className="line-through"
          />
          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
            -{savingsPercentage}%
          </span>
        </>
      )}
    </div>
  )
}