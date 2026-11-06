"""Source-checked, unchanged excerpts; not generated advice or clinical sign-off.

Allowlist only the milestone whose section has been checked. Scheduling rules
remain draft; this content does not validate their dates or prescribe treatment.
"""
from copy import deepcopy

_ANC_SECOND = {
    "source_title": "ICMR antenatal care workflow (December 2025)",
    "source_url": "https://www.icmr.gov.in/icmrobject/uploads/STWs/1771568619_ante-natalmanagementofnormalpregnancy-7.pdf",
    "section": "SECOND VISIT (SECOND TRIMESTER)",
    "verified_on": "2026-11-06",
    "applicability": "Selected topics from the official second-trimester visit section, not a complete visit plan:",
    "excerpts": [
        "Adherence to medications",
        "Pulse, BP in sitting position",
        "Discuss birth preparedness",
    ],
    "limit_notes": "Source verification is not local clinical sign-off. This workflow covers normal pregnancy; your clinician decides which checks apply. These excerpts do not confirm your appointment date or give medicine instructions.",
}


def guidance_for(milestone):
    if milestone["rule_id"] == "ANC-02" and milestone["type"] == "antenatal_visit_2":
        return deepcopy(_ANC_SECOND)
    return None
