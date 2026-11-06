"""Preparation is private, visit-scoped, and backed by the record schedule."""
import sys
import uuid
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parents[1]))
from fastapi.testclient import TestClient
from main import app


def mother(client):
    result = client.post('/api/auth/signup', json={
        'role': 'mother', 'phone_or_email': f'{uuid.uuid4().hex}@test.in',
        'password': 'test-password', 'name': 'Preparation mother',
        'pregnancy_status': 'pregnant', 'pregnancy_start_date': '2026-06-01',
    })
    assert result.status_code == 200
    data = result.json()
    return data['linked_id'], {'Authorization': 'Bearer ' + data['token']}


def path(wid, rule='ANC-02'):
    return f'/api/preparation/women/{wid}/milestones/{rule}'


def test_changed_pregnancy_date_rejects_stale_save_without_copying_notes():
    from copy import deepcopy
    from preparation.router import _PREPARATIONS
    from record.router import _WOMEN

    with TestClient(app) as client:
        wid, headers = mother(client)
        sheet = client.get(path(wid), headers=headers).json()
        payload = {**sheet['preparation'], 'questions': 'Notes for the original visit',
                   'expected_due_date': sheet['milestone']['due_date']}
        client.put(path(wid), headers=headers, json=payload).raise_for_status()
        before = deepcopy(dict(_PREPARATIONS))
        payload['questions'] = 'Unsaved edits for the original visit'
        _WOMEN[wid]['pregnancy_start_date'] = '2026-06-08'
        changed = client.get(path(wid), headers=headers).json()
        assert changed['milestone']['due_date'] != sheet['milestone']['due_date']
        response = client.put(path(wid), headers=headers, json=payload)
        assert response.status_code == 409, response.text
        assert dict(_PREPARATIONS) == before
        assert client.get(path(wid), headers=headers).json()['preparation'] == changed['preparation']
        _WOMEN[wid]['pregnancy_start_date'] = '2026-06-01'
        restored = client.get(path(wid), headers=headers).json()['preparation']
        assert restored['questions'] == 'Notes for the original visit'
        assert set(restored) == {'questions', 'checklist'}


@pytest.mark.parametrize('role', ['asha', 'doctor', 'clinic'])
def test_authenticated_staff_cannot_read_or_write_private_preparation(role, monkeypatch):
    monkeypatch.setenv('PUNARNAVA_OPEN_ACCESS', '1')
    monkeypatch.setenv('PUNARNAVA_STAFF_SIGNUP_OPEN', '1')
    with TestClient(app) as client:
        wid, owner = mother(client)
        sheet = client.get(path(wid), headers=owner).json()
        payload = {'questions': 'Private mother question', 'checklist': [],
                   'expected_due_date': sheet['milestone']['due_date']}
        client.put(path(wid), headers=owner, json=payload).raise_for_status()
        signup = client.post('/api/auth/signup', json={
            'role': role, 'phone_or_email': f'{uuid.uuid4().hex}@test.in',
            'password': 'test-password', 'name': 'Staff member',
        })
        assert signup.status_code == 200
        staff = {'Authorization': 'Bearer ' + signup.json()['token']}
        assert client.get(path(wid), headers=staff).status_code == 403
        assert client.put(path(wid), headers=staff,
                          json={**payload, 'questions': 'Staff overwrite'}).status_code == 403
        assert client.get(path(wid), headers=owner).json()['preparation'] == {
            'questions': payload['questions'], 'checklist': [],
        }


def test_visit_two_question_survives_read_and_is_not_on_visit_one():
    with TestClient(app) as client:
        wid, headers = mother(client)
        response = client.get(path(wid), headers=headers)
        assert response.status_code == 200
        sheet = response.json()
        assert sheet['milestone']['type'] == 'antenatal_visit_2'
        record = client.get(f'/api/record/women/{wid}', headers=headers).json()
        assert sheet['milestone'] == next(m for m in record['milestones'] if m['rule_id'] == 'ANC-02')
        preparation = sheet['preparation']
        preparation['questions'] = 'Can we discuss my visit plan?'
        preparation['checklist'][0]['checked'] = True
        saved = client.put(path(wid), headers=headers, json={**preparation,
                           'expected_due_date': sheet['milestone']['due_date']})
        assert saved.status_code == 200
        assert client.get(path(wid), headers=headers).json()['preparation'] == preparation
        other = client.get(path(wid, 'ANC-01'), headers=headers).json()['preparation']
        assert other['questions'] == ''
        assert not other['checklist'][0]['checked']


def test_visit_two_uses_specific_official_content_and_other_visits_fall_back():
    with TestClient(app) as client:
        wid, headers = mother(client)
        guidance = client.get(path(wid), headers=headers).json()['guidance']
        assert guidance['source_url'].startswith('https://www.icmr.gov.in/')
        assert guidance['section'] == 'SECOND VISIT (SECOND TRIMESTER)'
        assert 'Adherence to medications' in guidance['excerpts']
        assert client.get(path(wid, 'ANC-01'), headers=headers).json()['guidance'] is None


def test_private_ownership_applies_to_reads_and_writes_even_in_open_demo_mode(monkeypatch):
    monkeypatch.setenv('PUNARNAVA_OPEN_ACCESS', '1')
    with TestClient(app) as client:
        wid, owner = mother(client)
        other_wid, other = mother(client)
        payload = {'questions': 'Private question', 'checklist': []}
        request = {**payload, 'expected_due_date': client.get(path(wid), headers=owner).json()['milestone']['due_date']}
        assert client.put(path(wid), json=request, headers=owner).status_code == 200
        for headers, expected in [({}, 401), (other, 403), ({'Authorization': 'Bearer invalid'}, 401)]:
            assert client.get(path(wid), headers=headers).status_code == expected
            assert client.put(path(wid), headers=headers, json=request).status_code == expected
        assert client.get(path(other_wid), headers=other).json()['preparation']['questions'] == ''
        assert client.get(path(wid), headers=owner).json()['preparation'] == payload


def test_unknown_or_inapplicable_ids_and_invalid_payload_do_not_save():
    with TestClient(app) as client:
        wid, headers = mother(client)
        payload = {'questions': 'No', 'checklist': [],
                   'expected_due_date': client.get(path(wid), headers=headers).json()['milestone']['due_date']}
        for rule in ['unknown', 'PP-ALL-01']:
            assert client.get(path(wid, rule), headers=headers).status_code == 404
            assert client.put(path(wid, rule), headers=headers, json=payload).status_code == 404
        for invalid in [dict(payload, questions='x' * 5001), dict(payload, woman_id='other'),
                        {k: v for k, v in payload.items() if k != 'expected_due_date'},
                        dict(payload, expected_due_date='not-a-date'),
                        dict(payload, expected_due_date='2026-02-30'),
                        dict(payload, checklist=[{'label': ' ', 'checked': True}]),
                        dict(payload, checklist=[{'label': 'x'}] * 31)]:
            assert client.put(path(wid), headers=headers, json=invalid).status_code == 422
        assert client.get(path(wid), headers=headers).json()['preparation']['questions'] == ''


def test_completion_and_could_not_go_remain_independent_of_preparation(monkeypatch):
    monkeypatch.setenv('PUNARNAVA_OPEN_ACCESS', '')
    with TestClient(app) as client:
        wid, headers = mother(client)
        milestone = client.get(path(wid), headers=headers).json()['milestone']
        original = milestone['state']
        payload = {'questions': 'My question', 'checklist': []}
        client.put(path(wid), headers=headers, json={**payload, 'expected_due_date': milestone['due_date']}).raise_for_status()
        assert client.get(path(wid), headers=headers).json()['milestone']['state'] == original
        for outcome in ['could_not_go', 'done']:
            response = client.post('/api/outreach/respond', headers=headers, json={
                'woman_id': wid, 'rule_id': 'ANC-02', 'outcome': outcome,
                **({'reason': 'no_transport'} if outcome == 'could_not_go' else {}),
            })
            assert response.status_code == 200, response.text
        sheet = client.get(path(wid), headers=headers).json()
        assert sheet['milestone']['state'] == 'done'
        assert sheet['preparation'] == payload
        interactions = client.get(f'/api/record/women/{wid}/interactions', headers=headers).json()
        assert [i['outcome'] for i in interactions] == ['could_not_go', 'done']


def test_preparation_survives_real_process_restart(tmp_path):
    from test_persistence import _run
    db = tmp_path / 'preparation.db'
    wid = _run('''
        from fastapi.testclient import TestClient
        from main import app
        with TestClient(app) as c:
            a = c.post('/api/auth/signup', json={'role': 'mother', 'phone_or_email': 'prep@test.in',
                'password': 'test-password', 'name': 'Test', 'pregnancy_status': 'pregnant',
                'pregnancy_start_date': '2026-06-01'}).json()
            h = {'Authorization': 'Bearer ' + a['token']}
            p = '/api/preparation/women/' + a['linked_id'] + '/milestones/ANC-02'
            r = c.put(p, headers=h, json={'questions': 'Restart question',
                'expected_due_date': c.get(p, headers=h).json()['milestone']['due_date'],
                'checklist': [{'label': 'My reports', 'checked': True}]})
            assert r.status_code == 200, r.text
            print(a['linked_id'])
    ''', db)
    assert _run(f'''
        from fastapi.testclient import TestClient
        from main import app
        with TestClient(app) as c:
            a = c.post('/api/auth/login', json={{'phone_or_email': 'prep@test.in', 'password': 'test-password'}}).json()
            h = {{'Authorization': 'Bearer ' + a['token']}}
            p = '/api/preparation/women/{wid}/milestones/'
            s = c.get(p + 'ANC-02', headers=h).json()
            assert s['preparation'] == {{'questions': 'Restart question', 'checklist': [{{'label': 'My reports', 'checked': True}}]}}
            assert c.get(p + 'ANC-01', headers=h).json()['preparation']['questions'] == ''
            print('restored')
    ''', db) == 'restored'
