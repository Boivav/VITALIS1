import os
import json
from urllib.parse import urlencode
from urllib.request import urlopen, Request
from datetime import datetime,timedelta
from fastapi import FastAPI,Depends,HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc
from .database import Base,engine,get_db
from .models import User,Device,HealthMeasurement,Insight,Alert
from .schemas import RegisterIn,LoginIn,MeasurementIn,ChatIn
from .auth import hash_password,verify_password,create_token,current_user

Base.metadata.create_all(bind=engine)
app=FastAPI(title="VITALIS API",version="1.0")
app.add_middleware(CORSMiddleware,allow_origins=os.getenv("CORS_ORIGINS","http://localhost:5173").split(","),
                   allow_credentials=True,allow_methods=["*"],allow_headers=["*"])

@app.get("/health")
def health(): return {"status":"ok","service":"VITALIS API"}

@app.get("/environment/weather")
def environment_weather(latitude:float,longitude:float):
    """Proxy location-based weather data so the frontend can keep API keys/server details out of the browser."""
    if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
        raise HTTPException(400,"Invalid latitude or longitude")
    params=urlencode({
        "latitude":latitude,
        "longitude":longitude,
        "current":"temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
        "daily":"weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
        "forecast_days":5,
        "timezone":"auto"
    })
    try:
        req=Request("https://api.open-meteo.com/v1/forecast?"+params,headers={"User-Agent":"VITALIS/1.0"})
        with urlopen(req,timeout=8) as response:
            payload=json.loads(response.read().decode("utf-8"))
        current=payload.get("current",{})
        return {
            "latitude":payload.get("latitude",latitude),
            "longitude":payload.get("longitude",longitude),
            "timezone":payload.get("timezone"),
            "temperature":current.get("temperature_2m"),
            "relative_humidity":current.get("relative_humidity_2m"),
            "apparent_temperature":current.get("apparent_temperature"),
            "precipitation":current.get("precipitation"),
            "weather_code":current.get("weather_code"),
            "wind_speed":current.get("wind_speed_10m"),
            "daily":payload.get("daily"),
            "source":"Open-Meteo"
        }
    except Exception as e:
        raise HTTPException(502,f"Weather service unavailable: {e}")

@app.post("/auth/register")
def register(d:RegisterIn,db:Session=Depends(get_db)):
    if db.query(User).filter_by(email=d.email).first(): raise HTTPException(409,"Email already registered")
    u=User(name=d.name,email=d.email,password_hash=hash_password(d.password)); db.add(u); db.commit(); db.refresh(u)
    db.add(Device(user_id=u.id,device_id=f"ESP32_{u.id:03d}",name="VITALIS Health Monitor")); db.commit()
    return {"access_token":create_token(u.id),"user":{"id":u.id,"name":u.name,"email":u.email}}

@app.post("/auth/login")
def login(d:LoginIn,db:Session=Depends(get_db)):
    u=db.query(User).filter_by(email=d.email).first()
    if not u or not verify_password(d.password,u.password_hash): raise HTTPException(401,"Invalid email or password")
    return {"access_token":create_token(u.id),"user":{"id":u.id,"name":u.name,"email":u.email}}

@app.get("/users/me")
def me(u=Depends(current_user)): return {"id":u.id,"name":u.name,"email":u.email}

@app.post("/health/measurements")
def add(d:MeasurementIn,u=Depends(current_user),db:Session=Depends(get_db)):
    m=HealthMeasurement(user_id=u.id,**d.model_dump(exclude_none=True))
    if not m.timestamp: m.timestamp=datetime.utcnow()
    db.add(m); db.commit(); db.refresh(m); return {"id":m.id,"timestamp":m.timestamp}

@app.get("/health/latest")
def latest(u=Depends(current_user),db:Session=Depends(get_db)):
    m=db.query(HealthMeasurement).filter_by(user_id=u.id).order_by(desc(HealthMeasurement.timestamp)).first()
    if not m:return {}
    return {c.name:getattr(m,c.name) for c in HealthMeasurement.__table__.columns}

@app.get("/health/history")
def history(days:int=7,u=Depends(current_user),db:Session=Depends(get_db)):
    since=datetime.utcnow()-timedelta(days=min(days,365))
    rows=db.query(HealthMeasurement).filter(HealthMeasurement.user_id==u.id,HealthMeasurement.timestamp>=since).order_by(HealthMeasurement.timestamp).all()
    return [{c.name:getattr(r,c.name) for c in HealthMeasurement.__table__.columns} for r in rows]

@app.get("/devices")
def devices(u=Depends(current_user),db:Session=Depends(get_db)):
    return [{"id":d.id,"device_id":d.device_id,"name":d.name,"online":d.online,"last_seen":d.last_seen,"battery_level":d.battery_level}
            for d in db.query(Device).filter_by(user_id=u.id).all()]

@app.get("/insights")
def insights(u=Depends(current_user),db:Session=Depends(get_db)):
    return [{"id":i.id,"title":i.title,"body":i.body,"kind":i.kind,"created_at":i.created_at}
            for i in db.query(Insight).filter_by(user_id=u.id).order_by(desc(Insight.created_at)).limit(20)]

@app.post("/insights/generate")
def gen(u=Depends(current_user),db:Session=Depends(get_db)):
    m=db.query(HealthMeasurement).filter_by(user_id=u.id).order_by(desc(HealthMeasurement.timestamp)).first()
    if not m:return {"message":"No measurements available yet."}
    i=Insight(user_id=u.id,title="Personal baseline check",body="Your latest readings are being compared with your recent personal baseline.",kind="trend")
    db.add(i);db.commit();return {"title":i.title,"body":i.body}

@app.get("/alerts")
def alerts(u=Depends(current_user),db:Session=Depends(get_db)):
    return [{"id":a.id,"title":a.title,"body":a.body,"severity":a.severity,"created_at":a.created_at,"read":a.read}
            for a in db.query(Alert).filter_by(user_id=u.id).order_by(desc(Alert.created_at)).limit(30)]

@app.post("/ai/chat")
def chat(d:ChatIn,u=Depends(current_user),db:Session=Depends(get_db)):
    m=db.query(HealthMeasurement).filter_by(user_id=u.id).order_by(desc(HealthMeasurement.timestamp)).first()
    if not m:return {"answer":"I don't have health measurements yet. Connect your VITALIS device or enable Demo Mode."}
    q=d.message.lower()
    if "heart" in q: a=f"Your latest recorded heart rate is {m.heart_rate or 'unavailable'} BPM. VITALIS can compare it with your personal baseline as data accumulates."
    elif "oxygen" in q or "spo2" in q: a=f"Your latest recorded SpO₂ is {m.spo2 or 'unavailable'}%. This is a wellness-data summary, not a diagnosis."
    elif "temperature" in q: a=f"Your latest body temperature is {m.body_temperature or 'unavailable'} °C."
    else:a="I can summarize stored VITALIS measurements, trends and wellness indicators. Ask about heart rate, SpO₂, temperature, activity or recent trends."
    return {"answer":a}
