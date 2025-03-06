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

export const displayElevation = (elevation: number) => {
  if (elevation < 1000) {
    return `${elevation}m`;
  }

  return `${(elevation / 1000).toFixed(1)}km`;
};
