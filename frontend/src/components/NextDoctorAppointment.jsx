import { useEffect, useState } from "react";
import { getWoman } from "../lib/api";
import { formatDate } from "../lib/dates";

import { appointmentCalendarFile, downloadCalendarFile } from "../lib/appointmentCalendar";

export default function NextDoctorAppointment({ woman, allowCalendar = false }) {
  const [calendarStatus, setCalendarStatus] = useState("");
  const initial = woman.next_doctor_appointment?.appointment_date || "";
  const [date, setDate] = useState(initial);

  useEffect(() => {
    setDate(initial);
    let active = true;
    let pending = false;

    async function refresh() {
      if (!active || pending || document.hidden) return;
      pending = true;
      try {
        const result = await getWoman(woman.id);
        const record = result?.woman ?? result;
        if (active) setDate(record.next_doctor_appointment?.appointment_date || "");
      } catch {
        // Keep the last loaded date during temporary connection failures.
      } finally {
        pending = false;
      }
    }

    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [woman.id, initial]);

  async function exportCalendar(share) {
    setCalendarStatus("");
    try {
      const file = appointmentCalendarFile(date);
      if (share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Doctor appointment" });
        return;
      }
      downloadCalendarFile(file);
      setCalendarStatus(share
        ? "Calendar file downloaded. Attach it in a message to your spouse."
        : "Open the downloaded calendar file to save your appointment.");
    } catch (error) {
      if (error?.name !== "AbortError") {
        setCalendarStatus("Could not prepare the calendar file. Please try again.");
      }
    }
  }

  return (
    <section className="paper-card">
      <h2 className="card-title">Next doctor appointment</h2>
      <p>{date ? <time dateTime={date}>{formatDate(date)}</time> : "No appointment booked."}</p>
      {allowCalendar && date && (
        <div className="button-row">
          <button type="button" onClick={() => exportCalendar(false)}>Add to my calendar</button>
          <button type="button" onClick={() => exportCalendar(true)}>Share with spouse</button>
        </div>
      )}
      {allowCalendar && calendarStatus && <p role="status">{calendarStatus}</p>}
    </section>
  );
}
