export function appointmentCalendarFile(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Invalid appointment date");
  }

  const day = date.replaceAll("-", "");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Punarnava//Appointment Calendar//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}@punarnava`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${day}`,
    "SUMMARY:Doctor appointment",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:-P1D",
    "DESCRIPTION:Doctor appointment tomorrow",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return new File([lines.join("\r\n") + "\r\n"], `appointment-${date}.ics`, {
    type: "text/calendar;charset=utf-8",
  });
}

export function downloadCalendarFile(file) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
