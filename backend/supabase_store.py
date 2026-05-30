from dataclasses import dataclass
from typing import Any, Optional

import httpx
from fastapi import HTTPException, status

import models
from config import settings


@dataclass
class StoredUser:
    id: int
    email: str
    hashed_password: str
    role: models.RoleEnum


class SupabaseStore:
    def __init__(self):
        self.base_url = settings.SUPABASE_URL.rstrip("/")
        self.key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_PUBLISHABLE_KEY
        self.uses_service_key = bool(settings.SUPABASE_SERVICE_ROLE_KEY)

    def _headers(self, prefer: Optional[str] = None) -> dict[str, str]:
        headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
        }
        if prefer:
            headers["Prefer"] = prefer
        return headers

    def request(
        self,
        method: str,
        table: str,
        *,
        params: Optional[dict[str, Any]] = None,
        json: Optional[dict[str, Any]] = None,
        prefer: Optional[str] = None,
    ) -> Any:
        url = f"{self.base_url}/rest/v1/{table}"
        try:
            response = httpx.request(
                method,
                url,
                params=params,
                json=json,
                headers=self._headers(prefer),
                timeout=15,
            )
        except httpx.HTTPError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to reach Supabase data storage.",
            )

        if response.status_code >= 400:
            try:
                payload = response.json()
                detail = payload.get("message") or payload.get("details") or "Supabase request failed."
            except ValueError:
                detail = "Supabase request failed."
            if "row-level security" in detail.lower() and not self.uses_service_key:
                detail = (
                    "Supabase RLS blocked this backend write. "
                    "Set SUPABASE_SERVICE_ROLE_KEY in Vercel for server-side app data access."
                )
            raise HTTPException(status_code=response.status_code, detail=detail)

        if not response.content:
            return []

        return response.json()

    def select(
        self,
        table: str,
        *,
        params: Optional[dict[str, Any]] = None,
        order: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> list[dict[str, Any]]:
        query = {"select": "*"}
        if params:
            query.update(params)
        if order:
            query["order"] = order
        if limit is not None:
            query["limit"] = str(limit)
        rows = self.request("GET", table, params=query)
        return rows if isinstance(rows, list) else []

    def select_one(self, table: str, *, params: dict[str, Any]) -> Optional[dict[str, Any]]:
        rows = self.select(table, params=params, limit=1)
        return rows[0] if rows else None

    def insert(self, table: str, values: dict[str, Any]) -> dict[str, Any]:
        rows = self.request(
            "POST",
            table,
            json=values,
            prefer="return=representation",
        )
        if not rows:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unable to create {table.rstrip('s')}.",
            )
        return rows[0]

    def delete(self, table: str, *, params: dict[str, Any]) -> None:
        query = {"select": "id"}
        query.update(params)
        self.request(
            "DELETE",
            table,
            params=query,
            prefer="return=minimal",
        )


store = SupabaseStore()


def _role_value(role: models.RoleEnum | str) -> str:
    return role.value if isinstance(role, models.RoleEnum) else str(role)


def user_from_row(row: Optional[dict[str, Any]]) -> Optional[StoredUser]:
    if not row:
        return None
    return StoredUser(
        id=int(row["id"]),
        email=row["email"],
        hashed_password=row["hashed_password"],
        role=models.RoleEnum(row["role"]),
    )


def get_user_by_email(email: str) -> Optional[StoredUser]:
    row = store.select_one("users", params={"email": f"eq.{email}"})
    return user_from_row(row)


def get_user_by_id(user_id: int) -> Optional[StoredUser]:
    row = store.select_one("users", params={"id": f"eq.{user_id}"})
    return user_from_row(row)


def create_user(email: str, hashed_password: str, role: models.RoleEnum | str) -> StoredUser:
    row = store.insert(
        "users",
        {
            "email": email,
            "hashed_password": hashed_password,
            "role": _role_value(role),
        },
    )
    return user_from_row(row)


def ensure_welcome_bonus(user_id: int) -> None:
    existing = store.select_one(
        "ledger",
        params={
            "user_id": f"eq.{user_id}",
            "description": "eq.Welcome Bonus",
            "transaction_type": "eq.earned",
        },
    )
    if existing:
        return
    store.insert(
        "ledger",
        {
            "user_id": user_id,
            "amount": 100.0,
            "transaction_type": models.TransactionType.earned.value,
            "description": "Welcome Bonus",
        },
    )


def organizer_name(organizer_id: int) -> str:
    user = get_user_by_id(organizer_id)
    if not user or not user.email:
        return "Unknown Organization"
    return user.email.split("@")[0].capitalize()


def ledger_balance(user_id: int) -> float:
    ledgers = visible_ledger_rows(store.select("ledger", params={"user_id": f"eq.{user_id}"}))
    return sum(
        float(row["amount"])
        if row["transaction_type"] == models.TransactionType.earned.value
        else -float(row["amount"])
        for row in ledgers
    )


def visible_ledger_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        row for row in rows
        if not str(row.get("description") or "").startswith("CHAT|")
    ]


def lifetime_credits(user_id: int) -> float:
    ledgers = visible_ledger_rows(
        store.select(
            "ledger",
            params={
                "user_id": f"eq.{user_id}",
                "transaction_type": "eq.earned",
            },
        )
    )
    return sum(float(row["amount"]) for row in ledgers if float(row["amount"]) > 0)


def user_profile(user: StoredUser) -> dict[str, Any]:
    if user.role == models.RoleEnum.organizer:
        activities = store.select("activities", params={"organizer_id": f"eq.{user.id}"})
        activity_titles = {f"Earned from activity: {activity['title']}" for activity in activities}
        total = 0.0
        if activity_titles:
            ledgers = store.select("ledger", params={"transaction_type": "eq.earned"})
            total = sum(
                float(row["amount"])
                for row in ledgers
                if row.get("description") in activity_titles
            )
        lifetime = total
    else:
        total = ledger_balance(user.id)
        lifetime = lifetime_credits(user.id)

    return {
        "id": user.id,
        "email": user.email,
        "role": user.role.value,
        "total_credits": total,
        "lifetime_credits": lifetime,
    }


def activity_response(activity: dict[str, Any], *, user_status: str = "Available") -> dict[str, Any]:
    return {
        **activity,
        "organizer_name": organizer_name(int(activity["organizer_id"])),
        "user_status": user_status,
    }
