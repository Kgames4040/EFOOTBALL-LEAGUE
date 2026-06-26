import os
import uuid
import random
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Optional

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from db import db, client
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    require_admin,
    require_founder,
    require_staff,
)
from media import generate_cloudinary_signature, broadcast_push

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="eFootball League Manager")
api = APIRouter(prefix="/api")


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def new_id():
    return str(uuid.uuid4())


# ----------------------------- Models -----------------------------
class RegisterReq(BaseModel):
    username: str
    password: str


class LoginReq(BaseModel):
    username: str
    password: str


class ManagerInfo(BaseModel):
    name: str = ""
    birthdate: str = ""
    hometown: str = ""
    nationality: str = ""
    flag: str = ""
    photo_url: str = ""


class TeamCreateReq(BaseModel):
    name: str
    abbreviation: str
    logo_url: str = ""
    manager: ManagerInfo = Field(default_factory=ManagerInfo)
    description: str = ""


class Player(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    photo_url: str = ""
    value: float = 0.0
    slot: str = ""
    bench: bool = False


class SquadReq(BaseModel):
    formation: str
    players: List[Player] = []


class TeamUpdateReq(BaseModel):
    name: Optional[str] = None
    abbreviation: Optional[str] = None
    logo_url: Optional[str] = None
    manager: Optional[ManagerInfo] = None
    description: Optional[str] = None
    formation: Optional[str] = None
    players: Optional[List[Player]] = None


class TournamentReq(BaseModel):
    name: str
    weeks: int = 1
    cover_url: str = ""
    mode: str = "league"  # "league" | "cup"


class CupResultReq(BaseModel):
    home_score: int
    away_score: int
    pen_winner_team_id: Optional[str] = None


class ManualMatch(BaseModel):
    week: int
    home_team_id: str
    away_team_id: str
    scheduled_time: str = ""


class ManualFixtureReq(BaseModel):
    matches: List[ManualMatch]


class FinishReq(BaseModel):
    home_score: int
    away_score: int


class MatchEditReq(BaseModel):
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    scheduled_time: Optional[str] = None
    status: Optional[str] = None


class LeaderEntry(BaseModel):
    name: str
    team: str = ""
    value: int = 0


class LeaderboardReq(BaseModel):
    scorers: List[LeaderEntry] = []
    assists: List[LeaderEntry] = []


class MentionItem(BaseModel):
    type: str = "page"      # "user" | "page"
    label: str = ""
    url: str = ""
    tag: str = ""
    ref_id: str = ""


class MagazineReq(BaseModel):
    title: str
    body: str = ""
    image_url: str = ""
    video_url: str = ""
    is_leader_highlight: bool = False
    mentions: Optional[List[MentionItem]] = []


class MatchMagazineReq(BaseModel):
    title: str
    body: str = ""
    image_url: str = ""
    video_url: str = ""


class PoolClubReq(BaseModel):
    name: str
    logo_url: str = ""


class CancelMatchReq(BaseModel):
    reason: str = ""


class CupCancelReq(BaseModel):
    reason: str = ""
    cup_action: str = "both_out"   # "both_out" | "advance"
    advance_team_id: Optional[str] = None


class SettingsReq(BaseModel):
    max_budget: float


class AdminUserReq(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None


class ProfileUpdateReq(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None


class PushSubReq(BaseModel):
    endpoint: str
    keys: dict


class PoolPlayerReq(BaseModel):
    name: str
    surname: str = ""
    photo_url: str = ""
    value: float = 0.0
    club: str = ""
    club_logo_url: str = ""


class ExhibitionReq(BaseModel):
    home_team_id: str
    away_team_id: str
    scheduled_time: str = ""


# ----------------------------- Auth -----------------------------
def public_user(u: dict) -> dict:
    return {"id": u["id"], "username": u["username"], "role": u["role"], "team_id": u.get("team_id"), "assigned_match_id": u.get("assigned_match_id")}


@api.post("/auth/register")
async def register(req: RegisterReq):
    username = req.username.strip()
    if len(username) < 3:
        raise HTTPException(400, "Kullanıcı adı en az 3 karakter olmalı")
    if len(req.password) < 4:
        raise HTTPException(400, "Şifre en az 4 karakter olmalı")
    existing = await db.users.find_one({"username_lower": username.lower()})
    if existing:
        raise HTTPException(400, "Bu kullanıcı adı zaten alınmış")
    user = {
        "id": new_id(),
        "username": username,
        "username_lower": username.lower(),
        "password_hash": hash_password(req.password),
        "role": "user",
        "team_id": None,
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    token = create_access_token(user["id"], user["username"], user["role"])
    return {"token": token, "user": public_user(user)}


@api.post("/auth/login")
async def login(req: LoginReq):
    user = await db.users.find_one({"username_lower": req.username.strip().lower()})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "Kullanıcı adı veya şifre hatalı")
    token = create_access_token(user["id"], user["username"], user["role"])
    return {"token": token, "user": public_user(user)}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@api.put("/auth/me")
async def update_me(req: ProfileUpdateReq, user: dict = Depends(get_current_user)):
    update = {}
    if req.username is not None and req.username.strip():
        uname = req.username.strip()
        if len(uname) < 3:
            raise HTTPException(400, "Kullanıcı adı en az 3 karakter olmalı")
        existing = await db.users.find_one({"username_lower": uname.lower(), "id": {"$ne": user["id"]}})
        if existing:
            raise HTTPException(400, "Bu kullanıcı adı zaten alınmış")
        update["username"] = uname
        update["username_lower"] = uname.lower()
    if req.password:
        if len(req.password) < 4:
            raise HTTPException(400, "Şifre en az 4 karakter olmalı")
        update["password_hash"] = hash_password(req.password)
    if update:
        await db.users.update_one({"id": user["id"]}, {"$set": update})
    out = await db.users.find_one({"id": user["id"]})
    token = create_access_token(out["id"], out["username"], out["role"])
    return {"user": public_user(out), "token": token}


# ----------------------------- Cloudinary -----------------------------
@api.get("/cloudinary/signature")
async def cloudinary_signature(user: dict = Depends(get_current_user)):
    return generate_cloudinary_signature("efootball")


# ----------------------------- Settings -----------------------------
async def get_settings():
    s = await db.settings.find_one({"id": "global"}, {"_id": 0})
    if not s:
        s = {"id": "global", "max_budget": 500.0}
        await db.settings.insert_one(dict(s))
    return s


@api.get("/settings")
async def read_settings():
    return await get_settings()


@api.put("/admin/settings")
async def update_settings(req: SettingsReq, admin: dict = Depends(require_founder)):
    await db.settings.update_one({"id": "global"}, {"$set": {"max_budget": req.max_budget}}, upsert=True)
    return await get_settings()


# ----------------------------- Teams -----------------------------
def team_value(team: dict) -> float:
    return round(sum(float(p.get("value", 0)) for p in team.get("players", [])), 2)


async def team_summary(team: dict) -> dict:
    owner = await db.users.find_one({"id": team["user_id"]}, {"_id": 0, "username": 1})
    return {
        "id": team["id"],
        "name": team["name"],
        "abbreviation": team["abbreviation"],
        "logo_url": team.get("logo_url", ""),
        "manager": team.get("manager", {}),
        "description": team.get("description", ""),
        "formation": team.get("formation", "4-3-3"),
        "value": team_value(team),
        "player_count": len(team.get("players", [])),
        "owner": owner["username"] if owner else "",
    }


@api.post("/teams")
async def create_team(req: TeamCreateReq, user: dict = Depends(get_current_user)):
    existing = await db.teams.find_one({"user_id": user["id"]})
    if existing:
        raise HTTPException(400, "Zaten bir takımınız var")
    abbr = req.abbreviation.strip().upper()[:3]
    team = {
        "id": new_id(),
        "user_id": user["id"],
        "name": req.name.strip(),
        "abbreviation": abbr,
        "logo_url": req.logo_url,
        "manager": req.manager.model_dump(),
        "description": req.description,
        "formation": "4-3-3",
        "players": [],
        "created_at": now_iso(),
    }
    await db.teams.insert_one(dict(team))
    await db.users.update_one({"id": user["id"]}, {"$set": {"team_id": team["id"]}})
    team.pop("_id", None)
    return team


@api.get("/teams/me")
async def my_team(user: dict = Depends(get_current_user)):
    team = await db.teams.find_one({"user_id": user["id"]}, {"_id": 0})
    if not team:
        raise HTTPException(404, "Takım bulunamadı")
    team["value"] = team_value(team)
    return team


@api.put("/teams/me/info")
async def update_my_team_info(req: TeamUpdateReq, user: dict = Depends(get_current_user)):
    team = await db.teams.find_one({"user_id": user["id"]})
    if not team:
        raise HTTPException(404, "Takım bulunamadı")
    update = {}
    if req.name is not None:
        update["name"] = req.name.strip()
    if req.abbreviation is not None:
        update["abbreviation"] = req.abbreviation.strip().upper()[:3]
    if req.logo_url is not None:
        update["logo_url"] = req.logo_url
    if req.manager is not None:
        update["manager"] = req.manager.model_dump()
    if req.description is not None:
        update["description"] = req.description
    await db.teams.update_one({"id": team["id"]}, {"$set": update})
    out = await db.teams.find_one({"id": team["id"]}, {"_id": 0})
    out["value"] = team_value(out)
    return out


@api.put("/teams/me/squad")
async def save_squad(req: SquadReq, user: dict = Depends(get_current_user)):
    team = await db.teams.find_one({"user_id": user["id"]})
    if not team:
        raise HTTPException(404, "Takım bulunamadı")
    players = [p.model_dump() for p in req.players]
    # Enforce locked pool-player values: if a squad player's full name matches a
    # founder-defined pool player, its value is forced to the pool value.
    pool = await db.player_pool.find({}, {"_id": 0, "name": 1, "surname": 1, "value": 1}).to_list(2000)
    pool_val = {}
    for pp in pool:
        full = f"{pp.get('name', '')} {pp.get('surname', '')}".strip().lower()
        if full:
            pool_val[full] = pp.get("value", 0)
    for p in players:
        key = (p.get("name") or "").strip().lower()
        if key in pool_val:
            p["value"] = pool_val[key]
    await db.teams.update_one(
        {"id": team["id"]},
        {"$set": {"formation": req.formation, "players": players}},
    )
    out = await db.teams.find_one({"id": team["id"]}, {"_id": 0})
    out["value"] = team_value(out)
    return out


@api.get("/teams")
async def list_teams():
    teams = await db.teams.find({}, {"_id": 0}).to_list(500)
    return [await team_summary(t) for t in teams]


@api.get("/teams/{team_id}")
async def get_team(team_id: str):
    team = await db.teams.find_one({"id": team_id}, {"_id": 0})
    if not team:
        raise HTTPException(404, "Takım bulunamadı")
    team["value"] = team_value(team)
    owner = await db.users.find_one({"id": team["user_id"]}, {"_id": 0, "username": 1})
    team["owner"] = owner["username"] if owner else ""
    return team


# ----------------------------- Tournament -----------------------------
async def active_tournament():
    return await db.tournaments.find_one({"active": True}, {"_id": 0})


@api.get("/tournament/active")
async def read_active_tournament():
    return await active_tournament()


@api.post("/admin/tournament")
async def start_tournament(req: TournamentReq, admin: dict = Depends(require_founder)):
    await db.tournaments.update_many({"active": True}, {"$set": {"active": False}})
    mode = "cup" if req.mode == "cup" else "league"
    t = {
        "id": new_id(),
        "name": req.name.strip(),
        "weeks": max(1, req.weeks),
        "cover_url": req.cover_url,
        "mode": mode,
        "status": "running",
        "champion_team_id": None,
        "active": True,
        "created_at": now_iso(),
    }
    await db.tournaments.insert_one(dict(t))
    t.pop("_id", None)
    return t


@api.post("/admin/tournament/pause")
async def pause_tournament(admin: dict = Depends(require_founder)):
    t = await active_tournament()
    if not t:
        raise HTTPException(404, "Aktif turnuva yok")
    await db.tournaments.update_one({"id": t["id"]}, {"$set": {"status": "paused"}})
    return {"status": "paused"}


@api.post("/admin/tournament/resume")
async def resume_tournament(admin: dict = Depends(require_founder)):
    t = await active_tournament()
    if not t:
        raise HTTPException(404, "Aktif turnuva yok")
    await db.tournaments.update_one({"id": t["id"]}, {"$set": {"status": "running"}})
    return {"status": "running"}


@api.delete("/admin/tournament")
async def delete_tournament(admin: dict = Depends(require_founder)):
    t = await active_tournament()
    if not t:
        raise HTTPException(404, "Aktif turnuva yok")
    await db.matches.delete_many({"tournament_id": t["id"]})
    await db.tournaments.delete_one({"id": t["id"]})
    return {"deleted": True}


# ----------------------------- Fixtures / Matches -----------------------------
def round_robin(team_ids: List[str]):
    teams = list(team_ids)
    if len(teams) < 2:
        return []
    if len(teams) % 2 == 1:
        teams.append(None)
    n = len(teams)
    rounds = []
    for r in range(n - 1):
        pairs = []
        for i in range(n // 2):
            home = teams[i]
            away = teams[n - 1 - i]
            if home is not None and away is not None:
                if r % 2 == 1:
                    home, away = away, home
                pairs.append((home, away))
        rounds.append(pairs)
        teams = [teams[0]] + [teams[-1]] + teams[1:-1]
    return rounds


async def build_match_view(m: dict):
    home = await db.teams.find_one({"id": m["home_team_id"]}, {"_id": 0, "name": 1, "abbreviation": 1, "logo_url": 1})
    away = await db.teams.find_one({"id": m["away_team_id"]}, {"_id": 0, "name": 1, "abbreviation": 1, "logo_url": 1})
    return {
        "id": m["id"],
        "week": m["week"],
        "mode": m.get("mode", "league"),
        "exhibition": m.get("exhibition", False),
        "home_team_id": m["home_team_id"],
        "away_team_id": m["away_team_id"],
        "home": home or {"name": "?", "abbreviation": "???", "logo_url": ""},
        "away": away or {"name": "?", "abbreviation": "???", "logo_url": ""},
        "home_score": m.get("home_score"),
        "away_score": m.get("away_score"),
        "scheduled_time": m.get("scheduled_time", ""),
        "status": m.get("status", "scheduled"),
        "live_state": m.get("live_state", "scheduled"),
        "live_home": m.get("live_home", 0),
        "live_away": m.get("live_away", 0),
        "finished_at": m.get("finished_at"),
        "cancel_reason": m.get("cancel_reason", ""),
    }


@api.post("/admin/fixture/random")
async def create_random_fixture(admin: dict = Depends(require_founder)):
    t = await active_tournament()
    if not t:
        raise HTTPException(404, "Önce turnuva başlatın")
    teams = await db.teams.find({}, {"_id": 0, "id": 1}).to_list(500)
    ids = [x["id"] for x in teams]
    if len(ids) < 2:
        raise HTTPException(400, "Fikstür için en az 2 takım gerekli")
    await db.matches.delete_many({"tournament_id": t["id"]})
    rounds = round_robin(ids)
    # Double round-robin: second leg mirrors venues (home<->away).
    # This guarantees every team plays every other team twice, and the two
    # meetings are (len(rounds)) weeks apart so never in consecutive weeks (for >=3 teams).
    second = [[(away, home) for (home, away) in pairs] for pairs in rounds]
    rounds = rounds + second
    docs = []
    for week_idx, pairs in enumerate(rounds, start=1):
        for home, away in pairs:
            docs.append({
                "id": new_id(),
                "tournament_id": t["id"],
                "week": week_idx,
                "home_team_id": home,
                "away_team_id": away,
                "home_score": None,
                "away_score": None,
                "scheduled_time": "",
                "status": "scheduled",
                "created_at": now_iso(),
            })
    if docs:
        await db.matches.insert_many(docs)
    await db.tournaments.update_one({"id": t["id"]}, {"$set": {"weeks": len(rounds)}})
    return {"created": len(docs), "weeks": len(rounds)}


@api.post("/admin/fixture/manual")
async def create_manual_fixture(req: ManualFixtureReq, admin: dict = Depends(require_founder)):
    t = await active_tournament()
    if not t:
        raise HTTPException(404, "Önce turnuva başlatın")
    await db.matches.delete_many({"tournament_id": t["id"]})
    docs = []
    max_week = 1
    for m in req.matches:
        max_week = max(max_week, m.week)
        docs.append({
            "id": new_id(),
            "tournament_id": t["id"],
            "week": m.week,
            "home_team_id": m.home_team_id,
            "away_team_id": m.away_team_id,
            "home_score": None,
            "away_score": None,
            "scheduled_time": m.scheduled_time,
            "status": "scheduled",
            "created_at": now_iso(),
        })
    if docs:
        await db.matches.insert_many(docs)
    await db.tournaments.update_one({"id": t["id"]}, {"$set": {"weeks": max_week}})
    return {"created": len(docs)}


@api.get("/matches")
async def list_matches():
    t = await active_tournament()
    if not t:
        return []
    matches = await db.matches.find({"tournament_id": t["id"]}, {"_id": 0}).to_list(2000)
    matches.sort(key=lambda m: m["week"])
    return [await build_match_view(m) for m in matches]


async def ensure_running():
    t = await active_tournament()
    if not t:
        raise HTTPException(404, "Aktif turnuva yok")
    if t.get("status") == "paused":
        raise HTTPException(400, "Turnuva geçici olarak durduruldu")
    return t


@api.post("/admin/matches/{match_id}/start")
async def start_match(match_id: str, admin: dict = Depends(require_founder)):
    await ensure_running()
    m = await db.matches.find_one({"id": match_id})
    if not m:
        raise HTTPException(404, "Maç bulunamadı")
    await db.matches.update_one({"id": match_id}, {"$set": {"status": "live", "started_at": now_iso()}})
    view = await build_match_view(m)
    await broadcast_push(
        "🟢 Maç Başladı!",
        f"{view['home']['name']} - {view['away']['name']}",
        f"/match/{match_id}",
    )
    return {"status": "live"}


@api.post("/admin/matches/{match_id}/finish")
async def finish_match(match_id: str, req: FinishReq, admin: dict = Depends(require_founder)):
    await ensure_running()
    m = await db.matches.find_one({"id": match_id})
    if not m:
        raise HTTPException(404, "Maç bulunamadı")
    await db.matches.update_one(
        {"id": match_id},
        {"$set": {
            "status": "finished",
            "home_score": req.home_score,
            "away_score": req.away_score,
            "finished_at": now_iso(),
        }},
    )
    view = await build_match_view(m)
    await broadcast_push(
        "🏁 Maç Bitti!",
        f"{view['home']['name']} {req.home_score} - {req.away_score} {view['away']['name']}",
        f"/match/{match_id}",
    )
    return {"status": "finished"}


@api.put("/admin/matches/{match_id}")
async def edit_match(match_id: str, req: MatchEditReq, admin: dict = Depends(require_founder)):
    m = await db.matches.find_one({"id": match_id})
    if not m:
        raise HTTPException(404, "Maç bulunamadı")
    update = {}
    if req.home_score is not None:
        update["home_score"] = req.home_score
    if req.away_score is not None:
        update["away_score"] = req.away_score
    if req.scheduled_time is not None:
        update["scheduled_time"] = req.scheduled_time
    if req.status is not None:
        update["status"] = req.status
    if req.home_score is not None and req.away_score is not None and req.status is None:
        update["status"] = "finished"
    await db.matches.update_one({"id": match_id}, {"$set": update})
    out = await db.matches.find_one({"id": match_id})
    return await build_match_view(out)


@api.post("/admin/matches/{match_id}/cancel")
async def cancel_match(match_id: str, req: CancelMatchReq, admin: dict = Depends(require_founder)):
    m = await db.matches.find_one({"id": match_id})
    if not m:
        raise HTTPException(404, "Maç bulunamadı")
    if m.get("status") == "canceled":
        raise HTTPException(400, "Maç zaten iptal edilmiş")
    await db.matches.update_one(
        {"id": match_id},
        {"$set": {
            "status": "canceled",
            "cancel_reason": req.reason or "",
            "home_score": None,
            "away_score": None,
            "live_state": "scheduled",
            "canceled_at": now_iso(),
        }},
    )
    view = await build_match_view(m)
    t = await active_tournament()
    await publish_magazine(
        t["id"] if t else None,
        f"⛔ MAÇ İPTALİ {view['home']['name']} - {view['away']['name']}",
        req.reason or "Maç iptal edildi.",
    )
    return {"status": "canceled"}


# ----------------------------- Exhibition (gösteri) matches -----------------------------
@api.get("/exhibition-matches")
async def list_exhibition_matches():
    matches = await db.matches.find({"exhibition": True}, {"_id": 0}).to_list(500)
    matches.sort(key=lambda m: m.get("created_at") or "")
    return [await build_match_view(m) for m in matches]


@api.post("/admin/exhibition")
async def create_exhibition(req: ExhibitionReq, admin: dict = Depends(require_founder)):
    if req.home_team_id == req.away_team_id:
        raise HTTPException(400, "Farklı iki takım seçin")
    home = await db.teams.find_one({"id": req.home_team_id}, {"_id": 0})
    away = await db.teams.find_one({"id": req.away_team_id}, {"_id": 0})
    if not home or not away:
        raise HTTPException(404, "Takım bulunamadı")
    doc = {
        "id": new_id(),
        "tournament_id": None,
        "exhibition": True,
        "mode": "exhibition",
        "week": 0,
        "home_team_id": req.home_team_id,
        "away_team_id": req.away_team_id,
        "home_score": None,
        "away_score": None,
        "scheduled_time": req.scheduled_time,
        "status": "scheduled",
        "live_state": "scheduled",
        "created_at": now_iso(),
    }
    await db.matches.insert_one(dict(doc))
    await broadcast_push(
        "🤝 GÖSTERİ MAÇI OLUŞTURULDU",
        f"{home['name']} - {away['name']}",
        f"/match/{doc['id']}",
    )
    return await build_match_view(doc)


@api.delete("/admin/exhibition/{match_id}")
async def delete_exhibition(match_id: str, admin: dict = Depends(require_founder)):
    m = await db.matches.find_one({"id": match_id})
    if not m or not m.get("exhibition"):
        raise HTTPException(404, "Gösteri maçı bulunamadı")
    await db.matches.delete_one({"id": match_id})
    await db.users.update_many({"assigned_match_id": match_id}, {"$set": {"assigned_match_id": None, "role": "user"}})
    return {"deleted": True}


# ----------------------------- Cup (knockout) -----------------------------
async def team_lite(team_id):
    if not team_id:
        return None
    t = await db.teams.find_one({"id": team_id}, {"_id": 0, "id": 1, "name": 1, "abbreviation": 1, "logo_url": 1})
    return t or {"id": team_id, "name": "?", "abbreviation": "???", "logo_url": ""}


def cup_round_label(num_teams: int):
    if num_teams <= 2:
        return "Final"
    if num_teams <= 4:
        return "Yarı Final"
    if num_teams <= 8:
        return "Çeyrek Final"
    if num_teams <= 16:
        return "Son 16"
    if num_teams <= 32:
        return "Son 32"
    return None


def cup_match_doc(tid, round_no, slot, home, away):
    return {
        "id": new_id(),
        "tournament_id": tid,
        "mode": "cup",
        "round": round_no,
        "week": round_no,
        "slot_index": slot,
        "home_team_id": home,
        "away_team_id": away,
        "home_score": None,
        "away_score": None,
        "pen_winner_team_id": None,
        "winner_team_id": None,
        "bye": False,
        "status": "scheduled",
        "created_at": now_iso(),
    }


async def create_cup_round(tid, round_no, team_ids):
    teams = list(team_ids)
    n = len(teams)
    if n <= 1:
        await maybe_advance_round(tid, round_no)
        return
    docs = []
    slot = 0
    if n % 2 == 0:
        # normal knockout pairing
        for i in range(0, n, 2):
            docs.append(cup_match_doc(tid, round_no, slot, teams[i], teams[i + 1]))
            slot += 1
    else:
        # ODD -> mini league (round-robin); top `advance` (largest power of 2 < n) advance
        p = 1
        while p * 2 < n:
            p *= 2
        advance = p
        for i in range(n):
            for j in range(i + 1, n):
                d = cup_match_doc(tid, round_no, slot, teams[i], teams[j])
                d["group_round"] = True
                d["advance_count"] = advance
                docs.append(d)
                slot += 1
    if docs:
        await db.matches.insert_many(docs)
    await maybe_advance_round(tid, round_no)


def group_standings_order(matches):
    teams = set()
    for m in matches:
        teams.add(m["home_team_id"])
        if m.get("away_team_id"):
            teams.add(m.get("away_team_id"))
    table = {t: {"P": 0, "GD": 0, "GF": 0} for t in teams}
    for m in matches:
        if m.get("status") != "finished" or m.get("home_score") is None:
            continue
        h, a = m["home_team_id"], m["away_team_id"]
        hs, as_ = m["home_score"], m["away_score"]
        table[h]["GF"] += hs; table[h]["GD"] += hs - as_
        table[a]["GF"] += as_; table[a]["GD"] += as_ - hs
        if hs > as_:
            table[h]["P"] += 3
        elif hs < as_:
            table[a]["P"] += 3
        else:
            table[h]["P"] += 1; table[a]["P"] += 1
    return sorted(teams, key=lambda t: (table[t]["P"], table[t]["GD"], table[t]["GF"]), reverse=True)


async def _team_names(ids):
    name_map = {tm["id"]: tm["name"] for tm in await db.teams.find({"id": {"$in": list(ids)}}, {"_id": 0, "id": 1, "name": 1}).to_list(500)}
    return [name_map.get(i, "?") for i in ids]


async def maybe_advance_round(tid, round_no):
    matches = await db.matches.find({"tournament_id": tid, "round": round_no, "mode": "cup"}).to_list(500)
    if not matches:
        return
    # round complete when every match is finished or canceled (bye is already finished)
    if any(m.get("status") not in ("finished", "canceled") for m in matches):
        return
    nxt = await db.matches.find_one({"tournament_id": tid, "round": round_no + 1, "mode": "cup"})
    if nxt:
        return
    is_group = any(m.get("group_round") for m in matches)
    if is_group:
        advance = matches[0].get("advance_count", 1)
        order = group_standings_order(matches)
        qualifiers = order[:advance]
        names = await _team_names(qualifiers)
        if len(qualifiers) <= 1:
            await db.tournaments.update_one({"id": tid}, {"$set": {"champion_team_id": qualifiers[0] if qualifiers else None, "status": "finished"}})
            if qualifiers:
                await publish_magazine(tid, "🏆 Şampiyon", f"{names[0]} kupanın sahibi oldu! Tebrikler.")
        else:
            await publish_magazine(tid, f"{round_no}. Tur (Mini Lig) Sonucu", "Üst tura çıkanlar: " + ", ".join(names))
            await create_cup_round(tid, round_no + 1, qualifiers)
        return
    matches.sort(key=lambda x: x["slot_index"])
    winners = [m["winner_team_id"] for m in matches if m.get("winner_team_id")]
    names = await _team_names(winners)
    if len(winners) == 1:
        await db.tournaments.update_one({"id": tid}, {"$set": {"champion_team_id": winners[0], "status": "finished"}})
        await publish_magazine(tid, "🏆 Şampiyon", f"{names[0]} kupanın sahibi oldu! Tebrikler.")
    elif len(winners) == 0:
        await publish_magazine(tid, f"{round_no}. Tur", "Tüm maçlar iptal edildi, ilerleyen takım yok.")
    else:
        await publish_magazine(tid, f"{round_no}. Tur Atlayanları", "Tur atlayan takımlar: " + ", ".join(names))
        await create_cup_round(tid, round_no + 1, winners)


async def build_cup_match_view(m):
    return {
        "id": m["id"],
        "round": m["round"],
        "slot_index": m["slot_index"],
        "home": await team_lite(m["home_team_id"]),
        "away": await team_lite(m.get("away_team_id")),
        "home_score": m.get("home_score"),
        "away_score": m.get("away_score"),
        "winner_team_id": m.get("winner_team_id"),
        "pen_winner_team_id": m.get("pen_winner_team_id"),
        "bye": m.get("bye", False),
        "status": m.get("status", "scheduled"),
        "live_state": m.get("live_state", "scheduled"),
        "live_home": m.get("live_home", 0),
        "live_away": m.get("live_away", 0),
        "cancel_reason": m.get("cancel_reason", ""),
    }


async def build_cup_bracket(t):
    matches = await db.matches.find({"tournament_id": t["id"], "mode": "cup"}, {"_id": 0}).to_list(2000)
    rounds_map = {}
    for m in matches:
        rounds_map.setdefault(m["round"], []).append(m)
    rounds = []
    for rnd in sorted(rounds_map):
        ms = sorted(rounds_map[rnd], key=lambda x: x["slot_index"])
        num_teams = sum(1 if mm.get("bye") else 2 for mm in ms)
        rounds.append({
            "round": rnd,
            "label": cup_round_label(num_teams) or f"{rnd}. Tur",
            "matches": [await build_cup_match_view(mm) for mm in ms],
            "complete": all(mm.get("winner_team_id") for mm in ms),
        })
    champ = None
    if t.get("champion_team_id"):
        champ = await team_lite(t["champion_team_id"])
    return {
        "rounds": rounds,
        "champion": champ,
        "status": t.get("status"),
        "tournament": {"name": t["name"], "cover_url": t.get("cover_url", "")},
    }


@api.get("/cup/bracket")
async def cup_bracket():
    t = await active_tournament()
    if not t or t.get("mode") != "cup":
        return {"rounds": [], "champion": None, "status": None, "tournament": None}
    return await build_cup_bracket(t)


@api.get("/cup/summary")
async def cup_summary():
    t = await active_tournament()
    if not t or t.get("mode") != "cup":
        raise HTTPException(404, "Aktif kupa yok")
    data = await build_cup_bracket(t)
    matches = await db.matches.find(
        {"tournament_id": t["id"], "mode": "cup", "status": "finished"}, {"_id": 0}
    ).to_list(2000)
    goals = {}
    for m in matches:
        if m.get("bye") or m.get("home_score") is None:
            continue
        goals[m["home_team_id"]] = goals.get(m["home_team_id"], 0) + (m.get("home_score") or 0)
        goals[m["away_team_id"]] = goals.get(m["away_team_id"], 0) + (m.get("away_score") or 0)
    top = None
    if goals:
        top_id = max(goals, key=lambda k: goals[k])
        tl = await team_lite(top_id)
        top = {**tl, "goals": goals[top_id]}
    data["top_scorer_team"] = top
    return data


@api.post("/admin/cup/draw")
async def cup_draw(admin: dict = Depends(require_founder)):
    t = await active_tournament()
    if not t or t.get("mode") != "cup":
        raise HTTPException(400, "Aktif bir kupa yok")
    teams = await db.teams.find({}, {"_id": 0, "id": 1}).to_list(500)
    ids = [x["id"] for x in teams]
    if len(ids) < 2:
        raise HTTPException(400, "Kupa için en az 2 takım gerekli")
    await db.matches.delete_many({"tournament_id": t["id"]})
    await db.tournaments.update_one({"id": t["id"]}, {"$set": {"champion_team_id": None, "status": "running"}})
    random.shuffle(ids)
    await create_cup_round(t["id"], 1, ids)
    return {"ok": True, "teams": len(ids)}


@api.post("/admin/cup/reset")
async def cup_reset(admin: dict = Depends(require_founder)):
    t = await active_tournament()
    if not t or t.get("mode") != "cup":
        raise HTTPException(400, "Aktif bir kupa yok")
    await db.matches.delete_many({"tournament_id": t["id"]})
    await db.tournaments.update_one({"id": t["id"]}, {"$set": {"champion_team_id": None, "status": "running"}})
    return {"ok": True}


@api.post("/admin/cup/match/{match_id}/start")
async def cup_start_match(match_id: str, admin: dict = Depends(require_founder)):
    await ensure_running()
    m = await db.matches.find_one({"id": match_id})
    if not m or m.get("mode") != "cup":
        raise HTTPException(404, "Kupa maçı bulunamadı")
    if m.get("bye"):
        raise HTTPException(400, "Bay (otomatik tur atlayan) maçı başlatılamaz")
    if m.get("status") == "finished":
        raise HTTPException(400, "Maç zaten bitti")
    nxt = await db.matches.find_one({"tournament_id": m["tournament_id"], "round": m["round"] + 1, "mode": "cup"})
    if nxt:
        raise HTTPException(400, "Sonraki tur oluşturuldu. Bu turu düzenlemek için kupayı sıfırlayın.")
    await db.matches.update_one({"id": match_id}, {"$set": {"status": "live", "started_at": now_iso()}})
    home = await team_lite(m["home_team_id"])
    away = await team_lite(m.get("away_team_id"))
    await broadcast_push("🟢 Maç Başladı!", f"{home['name']} - {away['name'] if away else '?'}", f"/match/{match_id}")
    return {"status": "live"}


@api.post("/admin/cup/match/{match_id}/result")
async def cup_set_result(match_id: str, req: CupResultReq, admin: dict = Depends(require_founder)):
    await ensure_running()
    m = await db.matches.find_one({"id": match_id})
    if not m or m.get("mode") != "cup":
        raise HTTPException(404, "Kupa maçı bulunamadı")
    if m.get("bye"):
        raise HTTPException(400, "Bay (otomatik tur atlayan) maçı düzenlenemez")
    if m.get("status") not in ("live", "finished"):
        raise HTTPException(400, "Önce maçı başlatın")
    nxt = await db.matches.find_one({"tournament_id": m["tournament_id"], "round": m["round"] + 1, "mode": "cup"})
    if nxt:
        raise HTTPException(400, "Sonraki tur oluşturuldu. Bu turu düzenlemek için kupayı sıfırlayın.")
    hs, as_ = req.home_score, req.away_score
    if hs < 0 or as_ < 0:
        raise HTTPException(400, "Skor negatif olamaz")
    if hs == as_:
        pw = req.pen_winner_team_id
        if pw not in (m["home_team_id"], m["away_team_id"]):
            raise HTTPException(400, "Berabere maçta penaltı galibini seçmelisiniz")
        winner = pw
    else:
        winner = m["home_team_id"] if hs > as_ else m["away_team_id"]
    was_finished = m.get("status") == "finished"
    await db.matches.update_one(
        {"id": match_id},
        {"$set": {
            "home_score": hs,
            "away_score": as_,
            "pen_winner_team_id": (req.pen_winner_team_id if hs == as_ else None),
            "winner_team_id": winner,
            "status": "finished",
            "finished_at": now_iso(),
        }},
    )
    if not was_finished:
        home = await team_lite(m["home_team_id"])
        away = await team_lite(m.get("away_team_id"))
        pen = " (P)" if hs == as_ else ""
        await broadcast_push("🏁 Maç Bitti!", f"{home['name']} {hs} - {as_} {away['name'] if away else '?'}{pen}", f"/match/{match_id}")
    await maybe_advance_round(m["tournament_id"], m["round"])
    return {"ok": True, "winner_team_id": winner}


@api.post("/admin/cup/match/{match_id}/cancel")
async def cup_cancel_match(match_id: str, req: CupCancelReq, admin: dict = Depends(require_founder)):
    m = await db.matches.find_one({"id": match_id})
    if not m or m.get("mode") != "cup":
        raise HTTPException(404, "Kupa maçı bulunamadı")
    if m.get("bye"):
        raise HTTPException(400, "Bay (otomatik tur atlayan) maçı iptal edilemez")
    nxt = await db.matches.find_one({"tournament_id": m["tournament_id"], "round": m["round"] + 1, "mode": "cup"})
    if nxt:
        raise HTTPException(400, "Sonraki tur oluşturuldu. Bu turu düzenlemek için kupayı sıfırlayın.")
    winner = None
    if req.cup_action == "advance":
        if req.advance_team_id not in (m["home_team_id"], m.get("away_team_id")):
            raise HTTPException(400, "Üst tura çıkacak takımı seçin")
        winner = req.advance_team_id
    await db.matches.update_one(
        {"id": match_id},
        {"$set": {
            "status": "canceled",
            "cancel_reason": req.reason or "",
            "winner_team_id": winner,
            "home_score": None,
            "away_score": None,
            "live_state": "scheduled",
            "canceled_at": now_iso(),
        }},
    )
    home = await team_lite(m["home_team_id"])
    away = await team_lite(m.get("away_team_id"))
    await publish_magazine(
        m["tournament_id"],
        f"⛔ MAÇ İPTALİ {home['name']} - {away['name'] if away else '?'}",
        req.reason or "Maç iptal edildi.",
    )
    await maybe_advance_round(m["tournament_id"], m["round"])
    return {"status": "canceled", "winner_team_id": winner}


# ----------------------------- Live match system -----------------------------
HALF_REAL_SEC = 300      # 5 gerçek dk = 45 görüntü dk
BREAK_SEC = 90           # devre arası 1.5 dk
LIVE_CONSTS = {"half_real_sec": HALF_REAL_SEC, "break_sec": BREAK_SEC, "disp_per_half": 45}


class GoalReq(BaseModel):
    team_id: str


class LiveFinishReq(BaseModel):
    pen_winner_team_id: Optional[str] = None


async def check_match_access(match_id: str, user: dict):
    if user.get("role") == "founder":
        return
    if user.get("role") == "admin" and user.get("assigned_match_id") == match_id:
        return
    raise HTTPException(403, "Bu maç için yetkiniz yok")


async def get_match_or_404(match_id: str):
    m = await db.matches.find_one({"id": match_id})
    if not m:
        raise HTTPException(404, "Maç bulunamadı")
    return m


async def get_last5(team_id: str):
    cur = db.matches.find(
        {"status": "finished", "home_score": {"$ne": None}, "exhibition": {"$ne": True},
         "$or": [{"home_team_id": team_id}, {"away_team_id": team_id}]},
        {"_id": 0, "home_team_id": 1, "away_team_id": 1, "home_score": 1, "away_score": 1, "finished_at": 1},
    )
    ms = await cur.to_list(1000)
    ms.sort(key=lambda x: x.get("finished_at") or "", reverse=True)
    seq = []
    for m in ms[:5]:
        if m["home_team_id"] == team_id:
            gf, ga = m["home_score"], m["away_score"]
        else:
            gf, ga = m["away_score"], m["home_score"]
        seq.append("W" if gf > ga else ("D" if gf == ga else "L"))
    return seq


async def push_match(match_id: str, m: dict, title: str, body: str):
    await broadcast_push(title, body, f"/match/{match_id}")


def score_line(home, away, m):
    return f"{home['name']} {m.get('live_home', 0)} - {m.get('live_away', 0)} {away['name'] if away else '?'}"


@api.get("/matches/{match_id}/detail")
async def match_detail(match_id: str, user: dict = Depends(get_current_user)):
    m = await get_match_or_404(match_id)
    home = await db.teams.find_one({"id": m["home_team_id"]}, {"_id": 0})
    away = await db.teams.find_one({"id": m.get("away_team_id")}, {"_id": 0}) if m.get("away_team_id") else None

    def team_pub(t):
        if not t:
            return None
        return {
            "id": t["id"], "name": t.get("name"), "abbreviation": t.get("abbreviation"),
            "logo_url": t.get("logo_url", ""), "manager": t.get("manager") or {},
        }

    can_manage = user.get("role") == "founder" or (user.get("role") == "admin" and user.get("assigned_match_id") == match_id)
    return {
        "id": m["id"],
        "mode": m.get("mode", "league"),
        "week": m.get("week"),
        "round": m.get("round"),
        "label": cup_round_label(0) if False else None,
        "status": m.get("status", "scheduled"),
        "live_state": m.get("live_state", "scheduled"),
        "home": team_pub(home),
        "away": team_pub(away),
        "home_last5": await get_last5(m["home_team_id"]),
        "away_last5": await get_last5(m["away_team_id"]) if m.get("away_team_id") else [],
        "home_score": m.get("home_score"),
        "away_score": m.get("away_score"),
        "live_home": m.get("live_home", 0),
        "live_away": m.get("live_away", 0),
        "fh_start": m.get("fh_start"),
        "fh_injury": m.get("fh_injury", 0),
        "sh_start": m.get("sh_start"),
        "sh_injury": m.get("sh_injury", 0),
        "sh_eligible_at": m.get("sh_eligible_at"),
        "goal_events": m.get("goal_events", []),
        "winner_team_id": m.get("winner_team_id"),
        "bye": m.get("bye", False),
        "consts": LIVE_CONSTS,
        "can_manage": can_manage,
        "scheduled_time": m.get("scheduled_time", ""),
    }


@api.post("/live/matches/{match_id}/start-first-half")
async def live_start_first_half(match_id: str, user: dict = Depends(require_staff)):
    await check_match_access(match_id, user)
    m = await get_match_or_404(match_id)
    if not m.get("exhibition"):
        await ensure_running()
    if m.get("bye"):
        raise HTTPException(400, "Bay maçı başlatılamaz")
    if m.get("live_state") in ("first_half", "second_half"):
        raise HTTPException(400, "Maç zaten oynanıyor")
    home = await team_lite(m["home_team_id"]); away = await team_lite(m.get("away_team_id"))
    await db.matches.update_one({"id": match_id}, {"$set": {
        "status": "live", "live_state": "first_half", "fh_start": now_iso(),
        "fh_injury": random.randint(1, 5), "live_home": 0, "live_away": 0,
        "goal_events": [], "started_at": now_iso(),
        "sh_start": None, "sh_injury": 0, "sh_eligible_at": None,
    }})
    await push_match(match_id, m, "🟢 Maç Başladı!", f"{home['name']} - {away['name'] if away else '?'}")
    return {"ok": True}


@api.post("/live/matches/{match_id}/end-first-half")
async def live_end_first_half(match_id: str, user: dict = Depends(require_staff)):
    await check_match_access(match_id, user)
    m = await get_match_or_404(match_id)
    if m.get("live_state") != "first_half":
        raise HTTPException(400, "İlk yarı oynanmıyor")
    from datetime import timedelta
    eligible = (datetime.now(timezone.utc) + timedelta(seconds=BREAK_SEC)).isoformat()
    await db.matches.update_one({"id": match_id}, {"$set": {"live_state": "halftime", "fh_end": now_iso(), "sh_eligible_at": eligible}})
    m = await get_match_or_404(match_id)
    home = await team_lite(m["home_team_id"]); away = await team_lite(m.get("away_team_id"))
    await push_match(match_id, m, "⏸️ İLK YARI", score_line(home, away, m))
    return {"ok": True}


@api.post("/live/matches/{match_id}/start-second-half")
async def live_start_second_half(match_id: str, user: dict = Depends(require_staff)):
    await check_match_access(match_id, user)
    m = await get_match_or_404(match_id)
    if m.get("live_state") != "halftime":
        raise HTTPException(400, "Devre arası değil")
    await db.matches.update_one({"id": match_id}, {"$set": {"live_state": "second_half", "sh_start": now_iso(), "sh_injury": random.randint(1, 5)}})
    return {"ok": True}


@api.post("/live/matches/{match_id}/goal")
async def live_goal(match_id: str, req: GoalReq, user: dict = Depends(require_staff)):
    await check_match_access(match_id, user)
    m = await get_match_or_404(match_id)
    if m.get("live_state") not in ("first_half", "second_half"):
        raise HTTPException(400, "Maç canlı değil")
    if req.team_id not in (m["home_team_id"], m.get("away_team_id")):
        raise HTTPException(400, "Bu maçta olmayan takım")
    field = "live_home" if req.team_id == m["home_team_id"] else "live_away"
    new_val = m.get(field, 0) + 1
    event = {"team_id": req.team_id, "type": "goal", "ts": now_iso(), "state": m.get("live_state")}
    await db.matches.update_one({"id": match_id}, {"$set": {field: new_val}, "$push": {"goal_events": event}})
    m = await get_match_or_404(match_id)
    home = await team_lite(m["home_team_id"]); away = await team_lite(m.get("away_team_id"))
    scorer = home if req.team_id == m["home_team_id"] else away
    await push_match(match_id, m, f"GOOOOL⚽ {scorer['name']}", score_line(home, away, m))
    return {"ok": True, "live_home": m.get("live_home", 0), "live_away": m.get("live_away", 0)}


@api.post("/live/matches/{match_id}/correct-goal")
async def live_correct_goal(match_id: str, req: GoalReq, user: dict = Depends(require_staff)):
    await check_match_access(match_id, user)
    m = await get_match_or_404(match_id)
    if req.team_id not in (m["home_team_id"], m.get("away_team_id")):
        raise HTTPException(400, "Bu maçta olmayan takım")
    # move last goal: subtract from the OTHER team, add to the correct (req.team_id) team
    correct_field = "live_home" if req.team_id == m["home_team_id"] else "live_away"
    wrong_field = "live_away" if correct_field == "live_home" else "live_home"
    upd = {correct_field: m.get(correct_field, 0) + 1}
    if m.get(wrong_field, 0) > 0:
        upd[wrong_field] = m.get(wrong_field, 0) - 1
    event = {"team_id": req.team_id, "type": "correction", "ts": now_iso(), "state": m.get("live_state")}
    await db.matches.update_one({"id": match_id}, {"$set": upd, "$push": {"goal_events": event}})
    m = await get_match_or_404(match_id)
    home = await team_lite(m["home_team_id"]); away = await team_lite(m.get("away_team_id"))
    scorer = home if req.team_id == m["home_team_id"] else away
    await push_match(match_id, m, f"🔄 DÜZELTME · GOL: {scorer['name']}", score_line(home, away, m))
    return {"ok": True, "live_home": m.get("live_home", 0), "live_away": m.get("live_away", 0)}


@api.post("/live/matches/{match_id}/end-match")
async def live_end_match(match_id: str, req: LiveFinishReq, user: dict = Depends(require_staff)):
    await check_match_access(match_id, user)
    m = await get_match_or_404(match_id)
    if not m.get("exhibition"):
        await ensure_running()
    if m.get("live_state") not in ("first_half", "halftime", "second_half"):
        raise HTTPException(400, "Bitirilecek canlı maç yok")
    hs, as_ = m.get("live_home", 0), m.get("live_away", 0)
    is_cup = m.get("mode") == "cup"
    update = {"status": "finished", "live_state": "finished", "home_score": hs, "away_score": as_, "finished_at": now_iso()}
    if is_cup:
        if hs == as_:
            pw = req.pen_winner_team_id
            if pw not in (m["home_team_id"], m.get("away_team_id")):
                raise HTTPException(400, "Berabere bitti, penaltı galibini seçmelisiniz")
            winner = pw
            update["pen_winner_team_id"] = pw
        else:
            winner = m["home_team_id"] if hs > as_ else m["away_team_id"]
        update["winner_team_id"] = winner
    await db.matches.update_one({"id": match_id}, {"$set": update})
    m2 = await get_match_or_404(match_id)
    home = await team_lite(m2["home_team_id"]); away = await team_lite(m2.get("away_team_id"))
    await push_match(match_id, m2, "🏁 MAÇ BİTTİ", f"{home['name']} {hs} - {as_} {away['name'] if away else '?'}")
    if is_cup:
        await maybe_advance_round(m["tournament_id"], m["round"])
    return {"ok": True, "home_score": hs, "away_score": as_}


# ----------------------------- Standings -----------------------------
@api.get("/standings")
async def standings():
    t = await active_tournament()
    if not t:
        return []
    matches = await db.matches.find({"tournament_id": t["id"]}, {"_id": 0}).to_list(2000)
    team_ids = set()
    for m in matches:
        team_ids.add(m["home_team_id"])
        team_ids.add(m["away_team_id"])
    teams = await db.teams.find({"id": {"$in": list(team_ids)}}, {"_id": 0}).to_list(500)
    table = {}
    for tm in teams:
        table[tm["id"]] = {
            "team_id": tm["id"],
            "name": tm["name"],
            "abbreviation": tm["abbreviation"],
            "logo_url": tm.get("logo_url", ""),
            "OM": 0, "G": 0, "B": 0, "M": 0, "AG": 0, "YG": 0, "A": 0, "P": 0,
            "last5": [],
            "_seq": [],
        }
    finished = [m for m in matches if m.get("status") == "finished" and m.get("home_score") is not None]
    finished.sort(key=lambda m: (m["week"], m.get("finished_at") or ""))
    for m in finished:
        h, a = m["home_team_id"], m["away_team_id"]
        hs, as_ = m["home_score"], m["away_score"]
        if h not in table or a not in table:
            continue
        for tid, gf, ga in ((h, hs, as_), (a, as_, hs)):
            row = table[tid]
            row["OM"] += 1
            row["AG"] += gf
            row["YG"] += ga
            if gf > ga:
                row["G"] += 1
                row["P"] += 3
                row["_seq"].append("W")
            elif gf == ga:
                row["B"] += 1
                row["P"] += 1
                row["_seq"].append("D")
            else:
                row["M"] += 1
                row["_seq"].append("L")
    # Canceled matches count as played (0 points for both sides)
    canceled = [m for m in matches if m.get("status") == "canceled"]
    canceled.sort(key=lambda m: (m["week"], m.get("canceled_at") or ""))
    for m in canceled:
        h, a = m["home_team_id"], m["away_team_id"]
        for tid in (h, a):
            if tid in table:
                row = table[tid]
                row["OM"] += 1
                row["M"] += 1
                row["_seq"].append("L")
    rows = []
    for row in table.values():
        row["A"] = row["AG"] - row["YG"]
        row["last5"] = row["_seq"][-5:]
        del row["_seq"]
        rows.append(row)
    rows.sort(key=lambda r: (-r["P"], -r["A"], -r["AG"], r["name"]))
    for i, r in enumerate(rows, start=1):
        r["rank"] = i
    return rows


# ----------------------------- Leaderboard / Stats -----------------------------
@api.get("/leaderboard")
async def get_leaderboard():
    t = await active_tournament()
    tid = t["id"] if t else None
    scorers = await db.leaderboard.find({"tournament_id": tid, "kind": "scorer"}, {"_id": 0}).to_list(100)
    assists = await db.leaderboard.find({"tournament_id": tid, "kind": "assist"}, {"_id": 0}).to_list(100)
    scorers.sort(key=lambda x: -x["value"])
    assists.sort(key=lambda x: -x["value"])
    return {"scorers": scorers, "assists": assists}


@api.put("/admin/leaderboard")
async def set_leaderboard(req: LeaderboardReq, admin: dict = Depends(require_founder)):
    t = await active_tournament()
    tid = t["id"] if t else None
    await db.leaderboard.delete_many({"tournament_id": tid})
    docs = []
    for e in req.scorers:
        docs.append({"id": new_id(), "tournament_id": tid, "kind": "scorer", **e.model_dump()})
    for e in req.assists:
        docs.append({"id": new_id(), "tournament_id": tid, "kind": "assist", **e.model_dump()})
    if docs:
        await db.leaderboard.insert_many(docs)
    return {"ok": True}


# ----------------------------- Magazine -----------------------------
@api.get("/magazine")
async def get_magazine():
    items = await db.magazine.find({"match_id": None}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return items


async def publish_magazine(tournament_id, title, body="", image_url="", is_leader_highlight=False, push=True, video_url="", url=None, match_id=None, mentions=None):
    doc_id = new_id()
    doc = {
        "id": doc_id,
        "tournament_id": tournament_id,
        "title": title,
        "body": body,
        "image_url": image_url,
        "video_url": video_url,
        "is_leader_highlight": is_leader_highlight,
        "match_id": match_id,
        "mentions": mentions or [],
        "created_at": now_iso(),
    }
    await db.magazine.insert_one(dict(doc))
    doc.pop("_id", None)
    if url is None:
        url = f"/match/{match_id}" if match_id else f"/?magazine={doc_id}"
    if push:
        await broadcast_push(f"📰 {title}", (body or "")[:140] or "Yeni haber yayınlandı", url)
    return doc


@api.post("/admin/magazine")
async def add_magazine(req: MagazineReq, admin: dict = Depends(require_founder)):
    t = await active_tournament()
    return await publish_magazine(
        t["id"] if t else None, req.title, req.body, req.image_url, req.is_leader_highlight,
        video_url=req.video_url, mentions=[mm.model_dump() for mm in (req.mentions or [])],
    )


@api.get("/matches/{match_id}/magazine")
async def get_match_magazine(match_id: str, user: dict = Depends(get_current_user)):
    items = await db.magazine.find({"match_id": match_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return items


@api.post("/admin/matches/{match_id}/magazine")
async def add_match_magazine(match_id: str, req: MatchMagazineReq, user: dict = Depends(require_staff)):
    await check_match_access(match_id, user)
    m = await get_match_or_404(match_id)
    t_id = m.get("tournament_id")
    return await publish_magazine(
        t_id, req.title, req.body, req.image_url, False,
        video_url=req.video_url, match_id=match_id,
    )


@api.get("/mention-targets")
async def mention_targets(user: dict = Depends(require_founder)):
    targets = [
        {"type": "page", "label": "Ana Sayfa", "url": "/", "default_tag": "Ana Sayfa", "ref_id": ""},
        {"type": "page", "label": "Takımlar", "url": "/teams", "default_tag": "Takımlar", "ref_id": ""},
    ]
    teams = await db.teams.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(500)
    for t in teams:
        targets.append({"type": "team", "label": t["name"], "url": f"/teams/{t['id']}", "default_tag": t["name"], "ref_id": t["id"]})
    users = await db.users.find({}, {"_id": 0, "id": 1, "username": 1, "team_id": 1}).to_list(500)
    for u in users:
        url = f"/teams/{u['team_id']}" if u.get("team_id") else "/teams"
        targets.append({"type": "user", "label": u["username"], "url": url, "default_tag": f"@{u['username']}", "ref_id": u["id"]})
    return targets


@api.delete("/admin/magazine/{item_id}")
async def delete_magazine(item_id: str, admin: dict = Depends(require_founder)):
    await db.magazine.delete_one({"id": item_id})
    return {"deleted": True}


# ----------------------------- Player Pool (admin-managed) -----------------------------
@api.post("/admin/players")
async def add_pool_player(req: PoolPlayerReq, admin: dict = Depends(require_founder)):
    doc = {"id": new_id(), **req.model_dump(), "created_at": now_iso()}
    await db.player_pool.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@api.put("/admin/players/{player_id}")
async def update_pool_player(player_id: str, req: PoolPlayerReq, admin: dict = Depends(require_founder)):
    res = await db.player_pool.update_one({"id": player_id}, {"$set": req.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "Oyuncu bulunamadı")
    return {"ok": True}


@api.delete("/admin/players/{player_id}")
async def delete_pool_player(player_id: str, admin: dict = Depends(require_founder)):
    await db.player_pool.delete_one({"id": player_id})
    return {"deleted": True}


# ----------------------------- Pool clubs (founder-managed list box) -----------------------------
@api.get("/pool-clubs")
async def list_pool_clubs():
    return await db.pool_clubs.find({}, {"_id": 0}).sort("name", 1).to_list(500)


@api.post("/admin/pool-clubs")
async def add_pool_club(req: PoolClubReq, admin: dict = Depends(require_founder)):
    name = req.name.strip()
    if not name:
        raise HTTPException(400, "Takım adı gerekli")
    existing = await db.pool_clubs.find_one({"name_lower": name.lower()})
    if existing:
        raise HTTPException(400, "Bu takım zaten listede")
    doc = {"id": new_id(), "name": name, "name_lower": name.lower(), "logo_url": req.logo_url, "created_at": now_iso()}
    await db.pool_clubs.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@api.delete("/admin/pool-clubs/{club_id}")
async def delete_pool_club(club_id: str, admin: dict = Depends(require_founder)):
    await db.pool_clubs.delete_one({"id": club_id})
    return {"deleted": True}


@api.get("/players")
async def search_pool_players(q: str = Query("", description="arama")):
    query = {}
    if q.strip():
        query = {"$or": [
            {"name": {"$regex": q.strip(), "$options": "i"}},
            {"surname": {"$regex": q.strip(), "$options": "i"}},
            {"club": {"$regex": q.strip(), "$options": "i"}},
        ]}
    players = await db.player_pool.find(query, {"_id": 0}).sort("value", -1).to_list(300)
    return players


# ----------------------------- Admin user / team management -----------------------------
@api.get("/admin/users")
async def admin_list_users(admin: dict = Depends(require_founder)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
    for u in users:
        team = await db.teams.find_one({"user_id": u["id"]}, {"_id": 0, "name": 1, "id": 1})
        u["team_name"] = team["name"] if team else None
        u["team_id"] = team["id"] if team else None
    return users


@api.put("/admin/users/{user_id}")
async def admin_update_user(user_id: str, req: AdminUserReq, admin: dict = Depends(require_founder)):
    u = await db.users.find_one({"id": user_id})
    if not u:
        raise HTTPException(404, "Kullanıcı bulunamadı")
    update = {}
    if req.username:
        update["username"] = req.username.strip()
        update["username_lower"] = req.username.strip().lower()
    if req.password:
        update["password_hash"] = hash_password(req.password)
    if update:
        await db.users.update_one({"id": user_id}, {"$set": update})
    return {"ok": True}


@api.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, admin: dict = Depends(require_founder)):
    if user_id == admin["id"]:
        raise HTTPException(400, "Kendinizi silemezsiniz")
    await db.teams.delete_many({"user_id": user_id})
    await db.users.delete_one({"id": user_id})
    return {"deleted": True}


@api.put("/admin/teams/{team_id}")
async def admin_update_team(team_id: str, req: TeamUpdateReq, admin: dict = Depends(require_founder)):
    team = await db.teams.find_one({"id": team_id})
    if not team:
        raise HTTPException(404, "Takım bulunamadı")
    update = {}
    for field in ["name", "abbreviation", "logo_url", "description", "formation"]:
        val = getattr(req, field)
        if val is not None:
            update[field] = val
    if req.manager is not None:
        update["manager"] = req.manager.model_dump()
    if req.players is not None:
        update["players"] = [p.model_dump() for p in req.players]
    await db.teams.update_one({"id": team_id}, {"$set": update})
    out = await db.teams.find_one({"id": team_id}, {"_id": 0})
    out["value"] = team_value(out)
    return out


@api.delete("/admin/teams/{team_id}")
async def admin_delete_team(team_id: str, admin: dict = Depends(require_founder)):
    team = await db.teams.find_one({"id": team_id})
    if not team:
        raise HTTPException(404, "Takım bulunamadı")
    await db.users.update_one({"id": team["user_id"]}, {"$set": {"team_id": None}})
    await db.teams.delete_one({"id": team_id})
    await db.matches.delete_many({"$or": [{"home_team_id": team_id}, {"away_team_id": team_id}]})
    return {"deleted": True}


# ----------------------------- Day summary -----------------------------
@api.get("/day-summary")
async def day_summary(date: str = Query(...)):
    t = await active_tournament()
    if not t:
        return {"date": date, "matches": [], "standings": []}
    matches = await db.matches.find(
        {"tournament_id": t["id"], "status": "finished"}, {"_id": 0}
    ).to_list(2000)
    day_matches = [m for m in matches if (m.get("finished_at") or "").startswith(date)]
    day_matches.sort(key=lambda m: m.get("finished_at") or "")
    views = [await build_match_view(m) for m in day_matches]
    table = await standings()
    return {"date": date, "tournament": t["name"], "matches": views, "standings": table}


# ----------------------------- Push -----------------------------
@api.get("/push/public-key")
async def push_public_key():
    return {"publicKey": os.getenv("VAPID_PUBLIC_KEY")}


@api.post("/push/subscribe")
async def push_subscribe(req: PushSubReq, user: dict = Depends(get_current_user)):
    await db.push_subscriptions.update_one(
        {"endpoint": req.endpoint},
        {"$set": {"endpoint": req.endpoint, "keys": req.keys, "user_id": user["id"], "updated_at": now_iso()}},
        upsert=True,
    )
    return {"ok": True}


@api.post("/push/unsubscribe")
async def push_unsubscribe(req: PushSubReq, user: dict = Depends(get_current_user)):
    await db.push_subscriptions.delete_one({"endpoint": req.endpoint})
    return {"ok": True}


@api.get("/")
async def root():
    return {"message": "eFootball League Manager API"}


@api.get("/health")
async def health():
    return {"status": "ok", "time": now_iso()}


# ----------------------------- Branding (founder) -----------------------------
class BrandingReq(BaseModel):
    app_name: Optional[str] = None
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None


async def get_branding():
    b = await db.settings.find_one({"id": "branding"}, {"_id": 0})
    if not b:
        b = {"id": "branding", "app_name": "eFootball Lig", "logo_url": "", "favicon_url": ""}
        await db.settings.insert_one(dict(b))
    return b


@api.get("/branding")
async def read_branding():
    return await get_branding()


@api.put("/founder/branding")
async def update_branding(req: BrandingReq, founder: dict = Depends(require_founder)):
    await get_branding()
    upd = {k: v for k, v in req.model_dump().items() if v is not None}
    if upd:
        await db.settings.update_one({"id": "branding"}, {"$set": upd}, upsert=True)
    return await get_branding()


# ----------------------------- Roles (founder) -----------------------------
class GrantAdminReq(BaseModel):
    match_id: Optional[str] = None


@api.get("/founder/staff")
async def list_staff(founder: dict = Depends(require_founder)):
    admins = await db.users.find({"role": "admin"}, {"_id": 0, "password_hash": 0}).to_list(500)
    return admins


@api.post("/founder/users/{user_id}/grant-admin")
async def grant_admin(user_id: str, req: GrantAdminReq, founder: dict = Depends(require_founder)):
    u = await db.users.find_one({"id": user_id})
    if not u:
        raise HTTPException(404, "Kullanıcı bulunamadı")
    if u.get("role") == "founder":
        raise HTTPException(400, "Kurucunun rolü değiştirilemez")
    await db.users.update_one({"id": user_id}, {"$set": {"role": "admin", "assigned_match_id": req.match_id}})
    return {"ok": True}


@api.post("/founder/users/{user_id}/revoke-admin")
async def revoke_admin(user_id: str, founder: dict = Depends(require_founder)):
    await db.users.update_one({"id": user_id}, {"$set": {"role": "user", "assigned_match_id": None}})
    return {"ok": True}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("username_lower", unique=True)
    await db.teams.create_index("user_id")
    await db.matches.create_index("tournament_id")
    admin_username = os.environ.get("ADMIN_USERNAME", "neco")
    admin_password = os.environ.get("ADMIN_PASSWORD", "neco404")
    existing = await db.users.find_one({"username_lower": admin_username.lower()})
    if not existing:
        await db.users.insert_one({
            "id": new_id(),
            "username": admin_username,
            "username_lower": admin_username.lower(),
            "password_hash": hash_password(admin_password),
            "role": "founder",
            "team_id": None,
            "created_at": now_iso(),
        })
        logger.info("Kurucu oluşturuldu: %s", admin_username)
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"id": existing["id"]},
            {"$set": {"password_hash": hash_password(admin_password), "role": "founder"}},
        )
    elif existing.get("role") != "founder":
        await db.users.update_one({"id": existing["id"]}, {"$set": {"role": "founder"}})


@app.on_event("shutdown")
async def shutdown():
    client.close()
