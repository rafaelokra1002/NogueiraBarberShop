/**
 * Date utilities to handle timezone-safe date parsing
 * Prevents common issues with UTC conversion that cause date shifts
 */

/**
 * ✅ Safely parse a date string or Date object as local date
 * Prevents UTC timezone shifts that cause wrong dates
 * 
 * @param dateInput - Can be a Date object, ISO string, or YYYY-MM-DD string
 * @returns Date object in local timezone at noon (to avoid DST edge cases)
 * 
 * @example
 * // ❌ WRONG - causes UTC shift
 * new Date("2025-12-23") // May become 2025-12-22 depending on timezone
 * 
 * // ✅ CORRECT
 * parseLocalDate("2025-12-23") // Always 2025-12-23
 */
export function parseLocalDate(dateInput: string | Date): Date {
  if (dateInput instanceof Date) {
    return dateInput;
  }

  // Handle YYYY-MM-DD format (most common from input[type="date"])
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [y, m, d] = dateInput.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0, 0); // Noon to avoid DST issues
  }

  // Handle ISO strings with time (e.g., "2025-12-23T15:00:00.000Z")
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(dateInput)) {
    const [datePart] = dateInput.split('T');
    const [y, m, d] = datePart.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }

  // Fallback for other formats
  return new Date(dateInput);
}

/**
 * ✅ Convert a Date to YYYY-MM-DD string (local timezone)
 * Use this when sending dates to the backend
 * 
 * @example
 * // ❌ WRONG
 * date.toISOString() // "2025-12-23T15:00:00.000Z" - UTC, causes shifts
 * 
 * // ✅ CORRECT
 * formatDateForAPI(date) // "2025-12-23" - pure date, no timezone
 */
export function formatDateForAPI(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * ✅ Parse YYYY-MM-DD string from form input as local date
 * Special case for input[type="date"] values
 */
export function parseFormDate(dateString: string): Date {
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/**
 * ✅ Compare two dates ignoring time (day-level comparison)
 */
export function isSameLocalDay(date1: Date | string, date2: Date | string): boolean {
  const d1 = parseLocalDate(date1);
  const d2 = parseLocalDate(date2);
  
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}
