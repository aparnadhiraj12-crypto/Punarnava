"""Send reminders the day before a doctor-booked appointment."""
import asyncio
import logging
import re
import sqlite3
from contextlib import closing
from datetime import datetime, timedelta, timezone
from pathlib import Path

from auth.router import _USERS
from family.router import _send_sms
from persistence import db_path
from record.router import _WOMEN

IST = timezone(timedelta(hours=5, minutes=30))
log = logging.getLogger(__name__)


def mobile(value):
    number = re.sub(r"[ ()-]", "", value or "")
    if number.startswith("+91"):
        number = number[3:]
    return number if re.fullmatch(r"[6-9][0-9]{9}", number) else None


def run_once(now=None):
    now = (now or datetime.now(IST)).astimezone(IST)
    if now.hour < 9:
        return 0

    tomorrow = now.date() + timedelta(days=1)
    due = tomorrow.isoformat()
    path = db_path()
    if not path:
        raise RuntimeError("Appointment SMS requires persistent SQLite storage.")
    Path(path).parent.mkdir(parents=True, exist_ok=True)

    login_numbers = {
        user.get("linked_id"): mobile(user.get("phone_or_email"))
        for user in list(_USERS.values()) if user.get("role") == "mother"
    }
    accepted = 0

    with closing(sqlite3.connect(path, timeout=10)) as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS appointment_sms_log (
                woman_id TEXT NOT NULL,
                booked_date TEXT NOT NULL,
                recipient TEXT NOT NULL,
                status TEXT NOT NULL,
                PRIMARY KEY (woman_id, booked_date, recipient)
            )
        """)
        for wid, record in list(_WOMEN.items()):
            booking = record.get("next_doctor_appointment") or {}
            if booking.get("appointment_date") != due:
                continue

            mother = mobile(record.get("phone")) or login_numbers.get(wid)
            husband = mobile(record.get("spouse_phone"))
            for number in dict.fromkeys([mother, husband]):
                if not number:
                    continue
                current = (_WOMEN.get(wid) or {}).get("next_doctor_appointment") or {}
                if current.get("appointment_date") != due:
                    break

                key = (wid, due, number)
                with db:
                    claimed = db.execute(
                        "INSERT OR IGNORE INTO appointment_sms_log VALUES (?, ?, ?, 'pending')",
                        key,
                    ).rowcount
                if not claimed:
                    continue

                message = f"Punarnava reminder: the doctor appointment is tomorrow, {tomorrow:%d %b %Y}."
                try:
                    _send_sms(number, message)
                    status = "accepted"
                    accepted += 1
                except Exception:
                    status = "unconfirmed"
                    log.warning("Could not confirm an appointment SMS submission.")
                with db:
                    db.execute(
                        "UPDATE appointment_sms_log SET status=? "
                        "WHERE woman_id=? AND booked_date=? AND recipient=?",
                        (status, *key),
                    )
    return accepted


async def reminder_loop(stop):
    while not stop.is_set():
        try:
            await asyncio.to_thread(run_once)
        except Exception:
            log.exception("Appointment reminder check failed.")
        try:
            await asyncio.wait_for(stop.wait(), timeout=60)
        except asyncio.TimeoutError:
            pass
