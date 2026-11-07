import { useEffect, useState } from "react";
import { getWoman, getClinicClosureStatus, reportClinicClosed } from "../lib/api";
import { formatDate } from "../lib/dates";

import { appointmentCalendarFile, downloadCalendarFile } from "../lib/appointmentCalendar";

function ClinicClosureNotice({ womanId, clinicName }) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    let pending = false;
    async function refresh() {
      if (!active || pending || document.hidden) return;
      pending = true;
      try {
        const result = await getClinicClosureStatus(womanId);
        if (active) {
          setStatus(result);
          setError("");
        }
      } catch {
        if (active) setError("Could not load the latest clinic status.");
      } finally {
        pending = false;
      }
    }
    refresh();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [womanId, reload]);

  async function report() {
    if (!window.confirm(`Did you visit ${clinicName} today and find it closed? Other mothers booked there today will see an unconfirmed report.`)) return;
    setSending(true);
    setError("");
    try {
      const result = await reportClinicClosed(womanId);
      setStatus({ can_report: true, report: result.report });
      setReload(value => value + 1);
    } catch {
      setError("Could not submit the report. Refresh the clinic status and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {status?.report ? (
        <p role="status"><strong>Unconfirmed clinic closure. </strong>{status.report.message}</p>
      ) : status?.can_report && !error ? (
        <button type="button" disabled={sending} onClick={report}>
          {sending ? "Reporting..." : "Report clinic closed"}
        </button>
      ) : null}
      {error && <p role="status">{error}{" "}
        <button type="button" onClick={() => setReload(value => value + 1)}>Refresh status</button>
      </p>}
    </>
  );
}

export default function NextDoctorAppointment({ woman, allowCalendar = false, allowClinicReport = false }) {
  const [calendarStatus, setCalendarStatus] = useState("");
  const initial = woman.next_doctor_appointment ?? null;
  const [appointment, setAppointment] = useState(initial);
  const date = appointment?.appointment_date || "";

  useEffect(() => {
    setAppointment(initial);
    let active = true;
    let pending = false;

    async function refresh() {
      if (!active || pending || document.hidden) return;
      pending = true;
      try {
        const result = await getWoman(woman.id);
        const record = result?.woman ?? result;
        if (active) setAppointment(record.next_doctor_appointment ?? null);
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
      {date && appointment?.clinic_name && <p>Clinic: {appointment.clinic_name}</p>}
      {allowClinicReport && date && appointment?.clinic_id && (
        <ClinicClosureNotice
          key={JSON.stringify([woman.id, date, appointment.clinic_id])}
          womanId={woman.id}
          clinicName={appointment.clinic_name || "your booked clinic"}
        />
      )}
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
