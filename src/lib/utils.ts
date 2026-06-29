import { InvoiceItem } from '@/types';

// Simple class names utility
export function cn(...classes: (string | undefined | null | boolean)[]) {
  return classes.filter(Boolean).join(' ');
}

// Format number to currency
export function formatCurrency(amount: number, currencySymbol: string = '₹') {
  return `${currencySymbol}${Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Format ISO date to readable date
export function formatDate(dateString: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Calculate totals for a list of items
export function calculateTotals(items: Omit<InvoiceItem, 'id' | 'invoice_id'>[]) {
  let subtotal = 0;
  let tax_total = 0;
  let discount_total = 0;

  const calculatedItems = items.map(item => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    const taxRate = Number(item.tax_rate) || 0;
    const discountRate = Number(item.discount_rate) || 0;

    const baseAmount = qty * price;
    const discountAmount = baseAmount * (discountRate / 100);
    const taxableAmount = baseAmount - discountAmount;
    const taxAmount = taxableAmount * (taxRate / 100);
    const total = taxableAmount + taxAmount;

    subtotal += baseAmount;
    discount_total += discountAmount;
    tax_total += taxAmount;

    return {
      ...item,
      total: Number(total.toFixed(2))
    };
  });

  const grand_total = subtotal - discount_total + tax_total;

  return {
    items: calculatedItems,
    subtotal: Number(subtotal.toFixed(2)),
    tax_total: Number(tax_total.toFixed(2)),
    discount_total: Number(discount_total.toFixed(2)),
    grand_total: Number(grand_total.toFixed(2))
  };
}
