from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import httpx


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


# Models
class TripCreate(BaseModel):
    name: str
    description: Optional[str] = None
    start_location: str
    end_location: str

class Trip(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    start_location: str
    end_location: str
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TripUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_location: Optional[str] = None
    end_location: Optional[str] = None
    is_active: Optional[bool] = None

class AlarmCreate(BaseModel):
    name: str
    latitude: float
    longitude: float
    radius: int = Field(default=500)
    sound: str = Field(default="default")
    is_active: bool = Field(default=True)
    recurring: bool = Field(default=False)
    trip_id: Optional[str] = None
    sequence: Optional[int] = None
    waypoint_type: Optional[str] = None

class Alarm(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    latitude: float
    longitude: float
    radius: int
    sound: str
    is_active: bool
    recurring: bool
    trip_id: Optional[str] = None
    sequence: Optional[int] = None
    waypoint_type: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    triggered_at: Optional[datetime] = None

class AlarmUpdate(BaseModel):
    name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius: Optional[int] = None
    sound: Optional[str] = None
    is_active: Optional[bool] = None
    recurring: Optional[bool] = None
    triggered_at: Optional[datetime] = None

class AlarmHistoryCreate(BaseModel):
    alarm_id: str
    alarm_name: str
    latitude: float
    longitude: float
    trip_id: Optional[str] = None

class AlarmHistory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    alarm_id: str
    alarm_name: str
    latitude: float
    longitude: float
    trip_id: Optional[str] = None
    triggered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Trip Routes
@api_router.post("/trips", response_model=Trip)
async def create_trip(trip_input: TripCreate):
    """Create a new trip"""
    trip_dict = trip_input.model_dump()
    trip_obj = Trip(**trip_dict)
    
    doc = trip_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.trips.insert_one(doc)
    return trip_obj

@api_router.get("/trips", response_model=List[Trip])
async def get_trips():
    """Get all trips"""
    trips = await db.trips.find({}, {"_id": 0}).to_list(1000)
    
    for trip in trips:
        if isinstance(trip['created_at'], str):
            trip['created_at'] = datetime.fromisoformat(trip['created_at'])
    
    return trips

@api_router.get("/trips/{trip_id}", response_model=Trip)
async def get_trip(trip_id: str):
    """Get a specific trip"""
    trip = await db.trips.find_one({"id": trip_id}, {"_id": 0})
    
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    if isinstance(trip['created_at'], str):
        trip['created_at'] = datetime.fromisoformat(trip['created_at'])
    
    return trip

@api_router.put("/trips/{trip_id}", response_model=Trip)
async def update_trip(trip_id: str, trip_update: TripUpdate):
    """Update a trip"""
    update_data = {k: v for k, v in trip_update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.trips.update_one(
        {"id": trip_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    updated_trip = await db.trips.find_one({"id": trip_id}, {"_id": 0})
    
    if isinstance(updated_trip['created_at'], str):
        updated_trip['created_at'] = datetime.fromisoformat(updated_trip['created_at'])
    
    return updated_trip

@api_router.delete("/trips/{trip_id}")
async def delete_trip(trip_id: str):
    """Delete a trip and its associated alarms"""
    result = await db.trips.delete_one({"id": trip_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    await db.alarms.delete_many({"trip_id": trip_id})
    
    return {"message": "Trip and associated alarms deleted successfully"}

@api_router.get("/trips/{trip_id}/alarms", response_model=List[Alarm])
async def get_trip_alarms(trip_id: str):
    """Get all alarms for a specific trip, ordered by sequence"""
    alarms = await db.alarms.find(
        {"trip_id": trip_id}, 
        {"_id": 0}
    ).sort("sequence", 1).to_list(1000)
    
    for alarm in alarms:
        if isinstance(alarm['created_at'], str):
            alarm['created_at'] = datetime.fromisoformat(alarm['created_at'])
        if alarm.get('triggered_at') and isinstance(alarm['triggered_at'], str):
            alarm['triggered_at'] = datetime.fromisoformat(alarm['triggered_at'])
    
    return alarms


# Alarm Routes
@api_router.post("/alarms", response_model=Alarm)
async def create_alarm(alarm_input: AlarmCreate):
    """Create a new location alarm"""
    alarm_dict = alarm_input.model_dump()
    alarm_obj = Alarm(**alarm_dict)
    
    doc = alarm_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('triggered_at'):
        doc['triggered_at'] = doc['triggered_at'].isoformat()
    
    await db.alarms.insert_one(doc)
    return alarm_obj

@api_router.get("/alarms", response_model=List[Alarm])
async def get_alarms():
    """Get all location alarms"""
    alarms = await db.alarms.find({}, {"_id": 0}).to_list(1000)
    
    for alarm in alarms:
        if isinstance(alarm['created_at'], str):
            alarm['created_at'] = datetime.fromisoformat(alarm['created_at'])
        if alarm.get('triggered_at') and isinstance(alarm['triggered_at'], str):
            alarm['triggered_at'] = datetime.fromisoformat(alarm['triggered_at'])
    
    return alarms

@api_router.get("/alarms/{alarm_id}", response_model=Alarm)
async def get_alarm(alarm_id: str):
    """Get a specific alarm by ID"""
    alarm = await db.alarms.find_one({"id": alarm_id}, {"_id": 0})
    
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found")
    
    if isinstance(alarm['created_at'], str):
        alarm['created_at'] = datetime.fromisoformat(alarm['created_at'])
    if alarm.get('triggered_at') and isinstance(alarm['triggered_at'], str):
        alarm['triggered_at'] = datetime.fromisoformat(alarm['triggered_at'])
    
    return alarm

@api_router.put("/alarms/{alarm_id}", response_model=Alarm)
async def update_alarm(alarm_id: str, alarm_update: AlarmUpdate):
    """Update an existing alarm"""
    update_data = {k: v for k, v in alarm_update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    if 'triggered_at' in update_data and update_data['triggered_at']:
        update_data['triggered_at'] = update_data['triggered_at'].isoformat()
    
    result = await db.alarms.update_one(
        {"id": alarm_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alarm not found")
    
    updated_alarm = await db.alarms.find_one({"id": alarm_id}, {"_id": 0})
    
    if isinstance(updated_alarm['created_at'], str):
        updated_alarm['created_at'] = datetime.fromisoformat(updated_alarm['created_at'])
    if updated_alarm.get('triggered_at') and isinstance(updated_alarm['triggered_at'], str):
        updated_alarm['triggered_at'] = datetime.fromisoformat(updated_alarm['triggered_at'])
    
    return updated_alarm

@api_router.delete("/alarms/{alarm_id}")
async def delete_alarm(alarm_id: str):
    """Delete an alarm"""
    result = await db.alarms.delete_one({"id": alarm_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alarm not found")
    
    return {"message": "Alarm deleted successfully"}


# Alarm History Routes
@api_router.post("/alarm-history", response_model=AlarmHistory)
async def log_alarm_trigger(history_input: AlarmHistoryCreate):
    """Log when an alarm is triggered"""
    history_obj = AlarmHistory(**history_input.model_dump())
    
    doc = history_obj.model_dump()
    doc['triggered_at'] = doc['triggered_at'].isoformat()
    
    await db.alarm_history.insert_one(doc)
    return history_obj

@api_router.get("/alarm-history", response_model=List[AlarmHistory])
async def get_alarm_history(limit: int = 50):
    """Get alarm trigger history"""
    history = await db.alarm_history.find(
        {}, 
        {"_id": 0}
    ).sort("triggered_at", -1).limit(limit).to_list(limit)
    
    for record in history:
        if isinstance(record['triggered_at'], str):
            record['triggered_at'] = datetime.fromisoformat(record['triggered_at'])
    
    return history

@api_router.get("/alarm-history/{alarm_id}", response_model=List[AlarmHistory])
async def get_alarm_history_by_id(alarm_id: str):
    """Get trigger history for a specific alarm"""
    history = await db.alarm_history.find(
        {"alarm_id": alarm_id}, 
        {"_id": 0}
    ).sort("triggered_at", -1).to_list(100)
    
    for record in history:
        if isinstance(record['triggered_at'], str):
            record['triggered_at'] = datetime.fromisoformat(record['triggered_at'])
    
    return history


@api_router.get("/")
async def root():
    return {"message": "Location Alarm API"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()