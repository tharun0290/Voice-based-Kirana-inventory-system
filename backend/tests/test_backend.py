import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import pytest
import asyncio
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, Base, engine
from app.seed_data import seed_initial_products
from app.recommendation import compute_greedy_recommendations
from app.session_store import session_store
from app.product_service import find_matching_product

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "diffusiongemma" in data["model"]

def test_inventory_list():
    response = client.get("/api/inventory")
    assert response.status_code == 200
    items = response.json()
    assert len(items) >= 10
    # Check that each item has days_of_stock_remaining
    for item in items:
        assert "days_of_stock_remaining" in item
        assert "image_url" in item

def test_greedy_recommendation():
    db = SessionLocal()
    try:
        rec = compute_greedy_recommendations(db, budget=5000.0)
        assert rec["budget"] == 5000.0
        assert rec["total_spent"] <= 5000.0
        assert len(rec["recommendations"]) > 0
        # Check ascending order of days remaining
        days = [r["days_of_stock_remaining"] for r in rec["recommendations"]]
        assert days == sorted(days)
    finally:
        db.close()

def test_voice_add_stock_complete():
    # Complete voice command: "Rice 10 bags add cheyyi"
    response = client.post("/api/voice-command", json={"transcript": "Rice 10 bags add cheyyi"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["action"] == "stock_updated"
    assert "Rice" in data["product"]

def test_voice_native_telugu_script():
    # Native Telugu script: "బియ్యం 10 బస్తాలు వేయి"
    response = client.post("/api/voice-command", json={"transcript": "బియ్యం 10 బస్తాలు వేయి"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["action"] == "stock_updated"
    assert "Rice" in data["product"]

def test_voice_missing_quantity_triggers_clarification():
    # Missing quantity: "Add Maggi Noodles"
    response = client.post("/api/voice-command", json={"transcript": "Add Maggi Noodles"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "needs_clarification"
    assert "session_id" in data
    assert "How many" in data["question"]

    # Now clarify: "24 packets"
    session_id = data["session_id"]
    clarify_res = client.post("/api/clarify", json={"session_id": session_id, "reply_text": "24 packets"})
    assert clarify_res.status_code == 200
    cdata = clarify_res.json()
    assert cdata["status"] == "success"
    assert cdata["action"] in ["new_product_created", "stock_updated"]
    assert "Maggi" in cdata["product"]

def test_camera_command_with_clarification():
    # Base64 fake 1x1 png frame
    fake_frame = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    response = client.post("/api/camera-command", json={"image_b64": fake_frame, "voice_transcript": "add this item"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "needs_clarification"
    assert data["source"] == "camera"
    assert "session_id" in data

    # Clarify with count: "12 packets"
    sid = data["session_id"]
    clarify_res = client.post("/api/clarify", json={"session_id": sid, "reply_text": "12 packets"})
    assert clarify_res.status_code == 200
    cdata = clarify_res.json()
    assert cdata["status"] == "success"

def test_camera_command_complete():
    fake_frame = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    # Simultaneous speech with quantity: "add this biscuits 20 packets"
    response = client.post("/api/camera-command", json={"image_b64": fake_frame, "voice_transcript": "add this biscuits 20 packets"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "Biscuits" in data["product"]

def test_purchase_recommendation_api():
    response = client.post("/api/purchase-recommendation", json={"budget": 4000.0})
    assert response.status_code == 200
    data = response.json()
    assert data["budget"] == 4000.0
    assert len(data["narration"]) > 0
    assert len(data["recommendations"]) > 0

def test_update_product_image_endpoint():
    product = client.get("/api/inventory").json()[0]
    response = client.put(f"/api/products/{product['id']}/image", json={"image_url": "/assets/products/soap.png"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["image_url"] == "/assets/products/soap.png"

def test_delete_product_endpoint():
    product = client.get("/api/inventory").json()[0]
    response = client.delete(f"/api/products/{product['id']}")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["deleted_product_id"] == product["id"]

if __name__ == "__main__":
    print("Running tests...")
    test_health_check()
    test_inventory_list()
    test_greedy_recommendation()
    test_voice_add_stock_complete()
    test_voice_native_telugu_script()
    test_voice_missing_quantity_triggers_clarification()
    test_camera_command_with_clarification()
    test_camera_command_complete()
    test_purchase_recommendation_api()
    test_update_product_image_endpoint()
    test_delete_product_endpoint()
    print("ALL TESTS PASSED SUCCESSFULLY!")
