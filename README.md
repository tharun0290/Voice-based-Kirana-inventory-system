# కిరాణా మిత్ర AI — Kirana Mitra AI
### Voice & Camera Driven Inventory Management System for Indian Kirana Stores

Powered by NVIDIA's hosted **DiffusionGemma 26B A4B IT** (`google/diffusiongemma-26b-a4b-it`) multimodal reasoning brain, greedy inventory purchase recommendation algorithms, Whisper STT, and Nano Banana generated product assets.

---

## 🌟 Key Features

1. **Multimodal Reasoning with DiffusionGemma 26B A4B IT**:
   - Sole reasoning and language/vision layer via NVIDIA Integrate API (`https://integrate.api.nvidia.com/v1/chat/completions`).
   - Text-in / Text-out and Image-in / Text-out capability (multimodal input).
   - Strict JSON validation with retry mechanism and defensive server-side schema verification.

2. **Voice-Only Intent Extraction (`/api/voice-command`)**:
   - Transcribed Kirana speech in Telugu, Hindi, English, or Telugu-English/Hinglish.
   - Extracts structured intent (`ADD_STOCK`, `REMOVE_STOCK`, `PURCHASE_RECOMMENDATION`, `UNKNOWN`).
   - No guessing: missing quantities are returned as `null` and routed to the clarification flow.

3. **Camera-Based Item Detection (`/api/camera-command`)**:
   - Captures real-time camera frames (base64 JPEG) from the mobile or shop counter webcam.
   - Simultaneous voice listening ("Add this item" or "Add this 20 packets").
   - Identifies Indian grocery items and extracts quantities directly into inventory.

4. **Missing-Quantity Clarification Flow (`/api/clarify`)**:
   - Short-lived in-memory session store (2-minute TTL).
   - Prompts the shopkeeper: *"Detected Maggi Noodles. How many packets should I add?"*
   - Captures the shopkeeper's quick count reply via voice or quick selection chips (+6, +12, +24, +50).

5. **Product Resolution & Auto-Creation**:
   - Fuzzy transliteration matching (`rapidfuzz` token match + phonetic map e.g. "biyyam" -> Rice, "nune" -> Cooking Oil).
   - If a new product is detected during an add operation: auto-creates the product row.
   - Saves real camera snapshots directly as 512x512 square product thumbnails in `/assets/uploads/{slug}.jpg`.

6. **Greedy Purchase Recommendation Engine (`/api/purchase-recommendation`)**:
   - Formula:
     $$\text{days\_of\_stock\_remaining} = \frac{\text{current\_stock}}{\text{avg\_daily\_sales}}$$
   - Sorted ascending (lowest days remaining first).
   - Greedily allocates available budget (e.g. ₹5,000) starting with the most critical depleted stock.
   - DiffusionGemma generates a short, conversational shopkeeper narration in natural Telugu/English dialect without inventing numbers.

7. **Nano Banana Studio Product Assets**:
   - 11 pre-generated, clean 512x512 studio product images with uniform light background:
     - `rice.png`
     - `dal.png`
     - `cooking_oil.png`
     - `sugar.png`
     - `biscuits.png`
     - `soap.png`
     - `salt.png`
     - `tea_powder.png`
     - `atta.png`
     - `detergent_powder.png`
     - `unknown.png`

---

## 🚀 Getting Started

### 1. Requirements
- Python 3.10+
- Node.js 18+
- NVIDIA API Key (Optional: System includes an intelligent fallback simulator when key is not set)

### 2. Configure Environment (Optional)
Copy `.env.example` in `backend`:
```bash
cp backend/.env.example backend/.env
```
Add your NVIDIA API Key:
```env
NVIDIA_API_KEY=nvapi-...
```

### 3. Run the Services
You can double-click `start.bat` on Windows, or run in separate terminals:

**Backend:**
```bash
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Frontend:**
```bash
cd frontend
npm run dev
```

Open: **http://localhost:5173**

---

## 🧪 Automated Test Suite

Run the comprehensive unit test suite covering health checks, inventory listing, greedy recommendation algorithms, voice intents, clarification flows, and camera vision commands:

```bash
python backend/tests/test_backend.py
```
"# Voice-based-Kirana-inventory-system" 
