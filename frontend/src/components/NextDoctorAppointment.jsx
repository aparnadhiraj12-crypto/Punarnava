import { useEffect, useState } from "react";
import { getWoman } from "../lib/api";
import { formatDate } from "../lib/dates";

export default function NextDoctorAppointment({ woman }) {
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

  return (
    <section className="paper-card">
      <h2 className="card-title">Next doctor appointment</h2>
      <p>{date ? <time dateTime={date}>{formatDate(date)}</time> : "No appointment booked."}</p>
    </section>
  );
}
