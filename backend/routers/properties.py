from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime, timezone
from database import supabase
from models import Property, PropertyCreate, PropertyUpdate, Transaction, TransactionCreate

router = APIRouter(prefix="/api/properties", tags=["properties"])


@router.get("/", response_model=list[Property])
def list_properties(status: Optional[str] = None, property_type: Optional[str] = None):
    query = supabase.table("properties").select("*").order("created_at", desc=True)
    if status:
        query = query.eq("status", status)
    if property_type:
        query = query.eq("property_type", property_type)
    return query.execute().data


@router.post("/", response_model=Property, status_code=201)
def create_property(payload: PropertyCreate):
    now  = datetime.now(timezone.utc).isoformat()
    data = payload.model_dump()
    data["created_at"] = now
    data["updated_at"] = now
    result = supabase.table("properties").insert(data).execute()
    return result.data[0]


@router.get("/{property_id}", response_model=Property)
def get_property(property_id: str):
    result = supabase.table("properties").select("*").eq("id", property_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Property not found")
    return result.data[0]


@router.patch("/{property_id}", response_model=Property)
def update_property(property_id: str, payload: PropertyUpdate):
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = supabase.table("properties").update(data).eq("id", property_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Property not found")
    return result.data[0]


@router.delete("/{property_id}", status_code=204)
def delete_property(property_id: str):
    result = supabase.table("properties").delete().eq("id", property_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Property not found")


@router.get("/{property_id}/transactions", response_model=list[Transaction])
def list_transactions(property_id: str):
    return (
        supabase.table("transactions")
        .select("*").eq("property_id", property_id)
        .order("transaction_date", desc=True)
        .execute().data
    )


@router.post("/{property_id}/transactions", response_model=Transaction, status_code=201)
def create_transaction(property_id: str, payload: TransactionCreate):
    if payload.property_id != property_id:
        raise HTTPException(status_code=400, detail="property_id mismatch")
    now  = datetime.now(timezone.utc).isoformat()
    data = payload.model_dump()
    data["transaction_date"] = str(data["transaction_date"])
    data["created_at"] = now
    return supabase.table("transactions").insert(data).execute().data[0]
