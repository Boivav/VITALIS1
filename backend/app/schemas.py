from datetime import datetime
from typing import Optional
from pydantic import BaseModel,Field

class RegisterIn(BaseModel):
    name:str=Field(min_length=2,max_length=120)
    email:str
    password:str=Field(min_length=6,max_length=128)
class LoginIn(BaseModel):
    email:str
    password:str
class MeasurementIn(BaseModel):
    device_id:Optional[str]=None
    timestamp:Optional[datetime]=None
    heart_rate:Optional[float]=None
    spo2:Optional[float]=None
    body_temperature:Optional[float]=None
    ecg:Optional[float]=None
    ambient_temperature:Optional[float]=None
    aqi:Optional[float]=None
    battery_level:Optional[float]=None
    activity:Optional[float]=None
class ChatIn(BaseModel):
    message:str=Field(min_length=1,max_length=2000)
