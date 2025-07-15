from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    vorname: str
    nachname: str
    email: EmailStr


class UserCreate(UserBase):
    password: str
    filter_einstellungen: Optional[str] = None
    bewerbungsprofil: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class User(UserBase):
    id: int
    is_admin: bool = False
    is_active: bool = True
    profile_completed: bool = False
    filter_einstellungen: Optional[str] = None
    bewerbungsprofil: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    is_admin: bool = False
    profile_completed: bool = False


class TokenRefresh(BaseModel):
    refresh_token: str


class BewerbungBase(BaseModel):
    wohnungsname: str
    adresse: str
    preis: Optional[Decimal] = None
    anzahl_zimmer: Optional[int] = None


class BewerbungCreate(BewerbungBase):
    pass


class Bewerbung(BewerbungBase):
    id: int
    user_id: int
    status: str
    bewerbungsdatum: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class StatistikBase(BaseModel):
    anzahl_verschickter_bewerbungen: int = 0
    bewerbungen_pro_tag: int = 0
    erfolgreiche_bewerbungen: int = 0
    letzter_login: Optional[datetime] = None


class StatistikCreate(StatistikBase):
    pass


class Statistik(StatistikBase):
    id: int
    user_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class NachrichtBase(BaseModel):
    absender: str
    text: str


class NachrichtCreate(NachrichtBase):
    bewerbung_id: Optional[int] = None


class Nachricht(NachrichtBase):
    id: int
    user_id: int
    bewerbung_id: Optional[int] = None
    zeitstempel: datetime
    ist_gelesen: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class BewerbungsprofilUpdate(BaseModel):
    anrede: Optional[str] = None
    name: Optional[str] = None
    vorname: Optional[str] = None
    email: Optional[str] = None
    telefon: Optional[str] = None
    strasse: Optional[str] = None
    plz: Optional[str] = None
    ort: Optional[str] = None
    wbs_vorhanden: Optional[str] = None
    wbs_gueltig_bis: Optional[str] = None
    wbs_zimmeranzahl: Optional[str] = None
    einkommensgrenze: Optional[str] = None
    wbs_besonderer_wohnbedarf: Optional[str] = None
