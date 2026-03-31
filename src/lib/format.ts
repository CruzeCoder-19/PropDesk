import { formatDistanceToNow } from 'date-fns'

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

/** Full Indian Rupee format: ₹12,50,000 */
export function formatINR(amount: number): string {
  return inrFormatter.format(amount)
}

/** Compact format: ₹1.25 Cr / ₹45.50 L / ₹9,999 */
export function formatCrores(amount: number): string {
  if (amount >= 10_000_000) {
    return `₹${(amount / 10_000_000).toFixed(2)} Cr`
  }
  if (amount >= 100_000) {
    return `₹${(amount / 100_000).toFixed(2)} L`
  }
  return formatINR(amount)
}

/** "2 hours ago" style relative time */
export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}
