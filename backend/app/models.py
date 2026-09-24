from datetime import datetime
from sqlalchemy import Column,Integer,String,Float,DateTime,Boolean,ForeignKey,Text
from .database import Base

class User(Base):
    __tablename__="users"
    id=Column(Integer,primary_key=True)
    name=Column(String(120),nullable=False)
    email=Column(String(255),unique=True,nullable=False,index=True)
    password_hash=Column(String(255),nullable=False)

class Device(Base):
    __tablename__="devices"
    id=Column(Integer,primary_key=True)
    user_id=Column(Integer,ForeignKey("users.id"),nullable=False)
    device_id=Column(String(120),unique=True,nullable=False)
    name=Column(String(120),nullable=False)
    online=Column(Boolean,default=True)
    last_seen=Column(DateTime,default=datetime.utcnow)
    battery_level=Column(Float,default=87)

class HealthMeasurement(Base):
    __tablename__="health_measurements"
    id=Column(Integer,primary_key=True)
    user_id=Column(Integer,ForeignKey("users.id"),nullable=False)
    device_id=Column(String(120))
    timestamp=Column(DateTime,default=datetime.utcnow,index=True)
    heart_rate=Column(Float); spo2=Column(Float); body_temperature=Column(Float)
    ecg=Column(Float); ambient_temperature=Column(Float); aqi=Column(Float)
    battery_level=Column(Float); activity=Column(Float)

class Insight(Base):
    __tablename__="insights"
    id=Column(Integer,primary_key=True)
    user_id=Column(Integer,ForeignKey("users.id"),nullable=False)
    title=Column(String(200)); body=Column(Text); kind=Column(String(50))
    created_at=Column(DateTime,default=datetime.utcnow)

class Alert(Base):
    __tablename__="alerts"
    id=Column(Integer,primary_key=True)
    user_id=Column(Integer,ForeignKey("users.id"),nullable=False)
    title=Column(String(200)); body=Column(Text); severity=Column(String(30),default="info")
    created_at=Column(DateTime,default=datetime.utcnow); read=Column(Boolean,default=False)
