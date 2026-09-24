import os
from datetime import datetime,timedelta,timezone
from jose import jwt,JWTError
from passlib.context import CryptContext
from fastapi import Depends,HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .database import get_db
from .models import User
SECRET=os.getenv("JWT_SECRET","dev-secret")
pwd=CryptContext(schemes=["bcrypt"],deprecated="auto")
oauth2=OAuth2PasswordBearer(tokenUrl="/auth/login")
def hash_password(v): return pwd.hash(v)
def verify_password(v,h): return pwd.verify(v,h)
def create_token(uid):
    exp=datetime.now(timezone.utc)+timedelta(hours=12)
    return jwt.encode({"sub":str(uid),"exp":exp},SECRET,algorithm="HS256")
def current_user(token=Depends(oauth2),db:Session=Depends(get_db)):
    try: uid=int(jwt.decode(token,SECRET,algorithms=["HS256"])["sub"])
    except (JWTError,KeyError,ValueError): raise HTTPException(401,"Invalid or expired token")
    u=db.get(User,uid)
    if not u: raise HTTPException(401,"User not found")
    return u
