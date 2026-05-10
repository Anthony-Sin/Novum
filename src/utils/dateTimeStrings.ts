


export const CleanFormattedDateTime = (date: Date): string => {
  const hours   = date.getHours();
  const minutes = date.getMinutes();
  const ampm    = hours >= 12 ? 'pm' : 'am';
  const formattedTime = `${(hours % 12 || 12).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}${ampm}`;
  const day   = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'long' });
  const year  = date.getFullYear();

  const getOrdinal = (n: number): string => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  return `${formattedTime} on ${month} ${getOrdinal(day)}, ${year}`;
};


export const formatPaperDate = (date: Date): string => {
  const month = date.toLocaleString('en-US', { month: 'long' });
  const year  = date.getFullYear();
  const day   = date.getDate();
  const getOrdinal = (n: number): string => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  return `${month} ${getOrdinal(day)}, ${year}`;
};


export const daysSincePublication = (publishedDate: Date, asOf: Date = new Date()): number => {
  return Math.floor((asOf.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24));
};


export const formatRetractionNoticeDate = (date: Date): string =>
  `[RETRACTED ${CleanFormattedDateTime(date)}]`;

