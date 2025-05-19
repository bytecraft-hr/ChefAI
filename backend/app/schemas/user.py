from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    full_name: Optional[str]
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    email: EmailStr
    full_name: Optional[str]
    is_active: bool
    is_verified: bool

    class Config:
        orm_mode = True

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None