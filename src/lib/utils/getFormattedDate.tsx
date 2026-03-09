export default function getFormattedDate(date: string | number | Date): string {
  if (!date) {
    throw new Error("Date is undefined in getFormattedDate()!");
  }

  const parsedDate = new Date(date);
  const dateOptions: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  };

  return new Intl.DateTimeFormat("en-GB", dateOptions).format(parsedDate);
}

export interface TimeDifference {
  years?: number | undefined;
  months?: number | undefined;
  days?: number | undefined;
  hours?: number | undefined;
  minutes?: number | undefined;
  seconds?: number | undefined;
}

export function getExpirationCountDown(
  startDate: Date,
  endDate: Date,
): Partial<TimeDifference> {
  if (!(startDate instanceof Date) || isNaN(startDate.getTime())) {
    throw new Error("Expiration startDate is not a valid Date object");
  }

  if (!(endDate instanceof Date) || isNaN(endDate.getTime())) {
    throw new Error("Expiration endDate is not a valid Date object");
  }

  let delta = Math.abs(endDate.getTime() - startDate.getTime()) / 1000;

  const years = Math.floor(delta / (365.25 * 24 * 60 * 60));
  delta -= years * 365.25 * 24 * 60 * 60;

  const months = Math.floor(delta / (30.44 * 24 * 60 * 60));
  delta -= months * 30.44 * 24 * 60 * 60;

  const days = Math.floor(delta / (24 * 60 * 60));
  delta -= days * 24 * 60 * 60;

  const hours = Math.floor(delta / (60 * 60));
  delta -= hours * 60 * 60;

  const minutes = Math.floor(delta / 60);
  delta -= minutes * 60;

  const seconds = Math.floor(delta);

  const result: Partial<TimeDifference> = {};

  if (years) result.years = years;
  if (months) result.months = months;
  if (days) result.days = days;
  if (hours) result.hours = hours;
  if (minutes) result.minutes = minutes;
  if (seconds) result.seconds = seconds;

  return result;
}

export function isTimeUp(endDate: Date) {
  const startDate = new Date();
  return startDate >= new Date(endDate);
}
