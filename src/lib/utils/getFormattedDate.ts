type FormattableDate = string | number | Date | null | undefined;

export default function getFormattedDate(date: FormattableDate): string {
  if (date === null || date === undefined || date === "") {
    return "N/A";
  }

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return "N/A";
  }

  const dateOptions: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  };

  return new Intl.DateTimeFormat("en-GB", dateOptions).format(parsedDate);
}
