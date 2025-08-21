/**
 * Formats a given date to match the format used in the database.
 *
 * The input date is first converted to a locale string in the 'nb-NO' locale
 * with the 'Europe/Oslo' time zone, using a 24-hour clock and including the
 * day, month, year, hour, and minute.
 *
 * The resulting string is then reformatted from "DD.MM.YYYY, HH:MM" to "YYYY-MM-DDTHH:MM".
 *
 * @param {Date} date - The date to be formatted.
 * @returns {string} The formatted date string in the format "YYYY-MM-DDTHH:MM".
 */
const formatDate = (date) => {
  // We need to format the date to match the format in the database
  const dateLocal = date.toLocaleString('nb-NO', { timeZone: 'Europe/Oslo', hour12: false, hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
  // Reformat date from this "DD.MM.YYYY, HH:MM" to this format: YYYY-MM-DDTHH:MM
  return dateLocal.replace(/(\d{2})\.(\d{2})\.(\d{4}),\s(\d{2}):(\d{2})/, '$3-$2-$1T$4:$5')
}

module.exports = {
  formatDate
}
