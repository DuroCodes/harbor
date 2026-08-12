const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const compactCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const mediumDate = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
});

const shortDate = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'short',
});

export const format = {
  money(value: number, compact = false): string {
    const formatter = compact ? compactCurrency : currency;
    return formatter.format(value);
  },

  signedMoney(value: number): string {
    const formatted = format.money(Math.abs(value));
    if (value > 0) return `+${formatted}`;
    if (value < 0) return `-${format.money(Math.abs(value))}`;
    return formatted;
  },

  mediumDate(date: Date | string): string {
    return mediumDate.format(typeof date === 'string' ? new Date(date) : date);
  },

  shortDate(date: Date | string): string {
    return shortDate.format(typeof date === 'string' ? new Date(date) : date);
  },

  monthYear(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
    }).format(date);
  },
};
