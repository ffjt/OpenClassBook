import re
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.models.invitation import Invitation


def _create_book(client: TestClient) -> dict[str, object]:
    response = client.post(
        "/api/v1/books",
        json={
            "title": "Invitation Lifecycle",
            "description": "Secure invitation coverage",
            "owner_name": "Book Owner",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_invitation_lifecycle_enforces_limits_and_replaces_codes(
    client: TestClient,
    test_session_factory: sessionmaker[Session],
) -> None:
    book = _create_book(client)
    book_id = int(book["id"])
    assert re.fullmatch(r"OCB-[A-Z2-9]{26}", str(book["invite_code"]))

    initial = client.get(f"/api/v1/books/{book_id}/invitations")
    assert initial.status_code == 200
    assert initial.json()[0]["code"] == book["invite_code"]
    assert initial.json()[0]["status"] == "active"

    limited = client.post(
        f"/api/v1/books/{book_id}/invitations",
        json={
            "expires_at": (datetime.now(UTC) + timedelta(days=1)).isoformat(),
            "max_uses": 1,
        },
    )
    assert limited.status_code == 201, limited.text
    invitation = limited.json()
    code = invitation["code"]

    joined = client.post(f"/api/v1/join/{code}", json={"name": "Limited Author"})
    assert joined.status_code == 200, joined.text
    assert isinstance(joined.json()["author_token"], str)
    exhausted = client.post(f"/api/v1/join/{code}", json={"name": "Too Late"})
    assert exhausted.status_code == 404
    assert exhausted.json()["detail"]["code"] == "invitation_max_uses_reached"

    updated = client.get(f"/api/v1/books/{book_id}/invitations")
    used = next(item for item in updated.json() if item["id"] == invitation["id"])
    assert used["used_count"] == 1
    assert used["max_uses"] == 1

    disabled = client.post(f"/api/v1/books/{book_id}/invitations", json={})
    assert disabled.status_code == 201
    disabled_code = disabled.json()["code"]
    disabled_result = client.post(
        f"/api/v1/books/{book_id}/invitations/{disabled.json()['id']}/disable"
    )
    assert disabled_result.status_code == 200
    assert client.get(f"/api/v1/join/{disabled_code}").status_code == 403

    regenerated = client.post(
        f"/api/v1/books/{book_id}/invitations/{initial.json()[0]['id']}/regenerate"
    )
    assert regenerated.status_code == 200, regenerated.text
    assert regenerated.json()["code"] != book["invite_code"]
    assert client.get(f"/api/v1/join/{book['invite_code']}").status_code == 404

    expiring = client.post(f"/api/v1/books/{book_id}/invitations", json={})
    assert expiring.status_code == 201
    with test_session_factory() as session:
        persisted = session.get(Invitation, expiring.json()["id"])
        assert persisted is not None
        persisted.expires_at = datetime.now(UTC) - timedelta(seconds=1)
        session.commit()
    expired = client.get(f"/api/v1/join/{expiring.json()['code']}")
    assert expired.status_code == 404
    assert expired.json()["detail"]["code"] == "invitation_expired"


def test_author_token_cannot_manage_invitations_or_read_other_profiles(
    client: TestClient,
) -> None:
    book = _create_book(client)
    book_id = int(book["id"])
    first = client.post(
        f"/api/v1/join/{book['invite_code']}", json={"name": "First Author"}
    ).json()
    second = client.post(
        f"/api/v1/join/{book['invite_code']}", json={"name": "Second Author"}
    ).json()
    headers = {"Authorization": f"Bearer {first['author_token']}"}

    own_profile = client.get(f"/api/v1/authors/{first['author_id']}", headers=headers)
    assert own_profile.status_code == 200
    assert "invite_code" not in own_profile.json()["book"]
    assert own_profile.json()["book"]["author_count"] == 2
    other_profile = client.get(
        f"/api/v1/authors/{second['author_id']}", headers=headers
    )
    assert other_profile.status_code == 404
    assert (
        client.get(f"/api/v1/books/{book_id}/invitations", headers=headers).status_code
        == 401
    )
    assert client.get(f"/api/v1/books/{book_id}", headers=headers).status_code == 401
