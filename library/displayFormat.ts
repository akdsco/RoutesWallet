export const formatMinutesToHoursAndMinutes = (
  totalMinutes: number,
): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (hours > 0 && minutes % 60 === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
};
