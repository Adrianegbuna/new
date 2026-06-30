/**
 * Custom hook for currency formatting
 * Formats prices to Nigerian Naira (₦) format
 */

export function useCurrency() {
  const formatPrice = (price: number): string => {
    if (!price) return '₦0'
    return `₦${parseFloat(price.toString()).toLocaleString('en-NG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`
  }

  const formatNumber = (num: number): string => {
    return parseFloat(num.toString()).toLocaleString('en-NG')
  }

  return {
    formatPrice,
    formatNumber
  }
}
