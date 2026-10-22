from pathlib import Path

import yaml

PATH = Path(__file__).parent.parent / "rulesets" / "movement_media.yaml"
KINDS = {"video", "article"}
LANGS = {"en", "hi", "te", "ta", "kn", "ml", "mr", "bn", "gu", "pa", "or"}
LENGTHS = {"short", "medium"}
STAGES = {"pregnant_t1", "pregnant_t2", "pregnant_t3", "postpartum"}
DELIVERY = {"any", "normal", "csection"}
TOPICS = {"walking", "stretching", "yoga", "breathing", "pelvic_floor", "posture", "rest"}
REQUIRED = ("id", "kind", "title", "publisher", "url", "language", "length",
            "stage", "delivery_mode", "topic", "reviewed_by", "reviewed_on", "citation")


def load():
    with open(PATH, encoding="utf-8") as f:
        return yaml.safe_load(f)


def test_file_loads_with_list():
    data = load()
    assert data["version"]
    assert isinstance(data["items"], list)


def test_ids_unique():
    ids = [i["id"] for i in load()["items"]]
    assert len(ids) == len(set(ids))


def test_each_item_has_required_fields_and_valid_values():
    for i in load()["items"]:
        for key in REQUIRED:
            assert i.get(key), f"{i.get('id')} missing {key}"
        assert i["kind"] in KINDS, i["id"]
        assert i["language"] in LANGS, i["id"]
        assert i["length"] in LENGTHS, i["id"]
        assert i["stage"] in STAGES, i["id"]
        assert i["delivery_mode"] in DELIVERY, i["id"]
        assert i["topic"] in TOPICS, i["id"]


def test_every_item_has_reviewer_and_https_link():
    for i in load()["items"]:
        assert str(i["url"]).startswith("https://"), i["id"]
        assert str(i["reviewed_by"]).strip(), i["id"]
        assert str(i["reviewed_on"]).strip(), i["id"]