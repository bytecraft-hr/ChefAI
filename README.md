
# 🧑‍🍳 Chef AI – Intelligent Recipe Assistant

Chef AI is an AI-powered full-stack cooking assistant that helps users get personalized meal suggestions using rule-based logic, Retrieval-Augmented Generation (RAG), and external APIs. The system is built with FastAPI, PostgreSQL, Sentence-BERT, LangChain, and React.

---

## 📦 Project Structure

```
.
├── backend/              # FastAPI backend for API, chat, auth, DB logic
├── frontend-cookbook-ai/ # React frontend
├── nlp-service/          # Sentence-BERT & NLP preprocessor
├── database/init.sql     # PostgreSQL schema & seed data
├── .env                  # Environment config (shared)
├── docker-compose.yml    # Multi-service setup
```

---

## 🛠️ Prerequisites

- **Docker & Docker Compose**
- Optional: Python 3.11+ and Node.js for local development

---

## 🚀 Quick Start (with Docker)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/chef-ai.git
cd chef-ai
```

### 2. Create the `.env` File

Create a `.env` file in the root directory with the following content:

```env
# .env
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
DATABASE_URL=postgresql+psycopg2://postgres:mirth@postgres/mirth

SPOONACULAR_API_KEY=your_spoonacular_api_key_here
FIREBASE_CREDENTIALS_PATH=/app/firebase-credentials.json

NLP_SERVICE_URL=http://nlp-service:8001/process
ALLOWED_ORIGINS=http://localhost:3000
```

> 🔐 Place your Firebase JSON key at:  
> `./langchain-f849f-firebase-adminsdk-fbsvc-d0950e3194.json`

---

### 3. Start the Full Stack

```bash
docker compose up --build
```

This will:
- Spin up a PostgreSQL database with the `mirth` schema
- Start the NLP service (SBERT, spaCy)
- Start the FastAPI backend with Firebase + LangChain support
- Serve the React frontend on [http://localhost:3000](http://localhost:3000)

---

## 🧪 Health Checks

You can verify if the backend is working:

```bash
curl http://localhost:8000/ping
# → {"status": "healthy"}
```

Or check database readiness:

```bash
docker compose logs postgres
```

---

## 🌐 Available Services

| Service       | Description                                | URL                           |
|---------------|--------------------------------------------|-------------------------------|
| Frontend      | React App for chat, pantry, preferences    | http://localhost:3000         |
| Backend       | FastAPI API with chat endpoints            | http://localhost:8000/docs    |
| NLP Service   | Sentence-BERT + spaCy server               | http://localhost:8001/process |
| PostgreSQL    | Database (user, pantry, recipes)           | port 5432                     |

---

## 🧠 Chat Modes

| Mode    | Description                                      |
|---------|--------------------------------------------------|
| `rule`  | Filters recipes using pantry, preferences, SBERT |
| `rag`   | Uses LangChain RAG with Mistral & Chroma         |
| `online`| Future mode (Spoonacular or live APIs)           |

You can choose the mode in the frontend chat dropdown.

---

## 🧹 Cleanup

To stop and remove everything:

```bash
docker compose down -v
```

---

## ✨ Features

- ✅ JWT-based authentication
- 🧠 NLP: spaCy + SBERT ranking
- 🔍 RAG: Chroma + MistralAI
- 🔥 Firebase chat history logging
- 🍳 Pantry and recipe filtering
- 🎨 Clean React UI with cooking steps

---

## 📂 Database Schema Overview

```sql
Users
├── PantryItems
├── UserSettings (preferences, allergies, dislikes)

Recipes
├── RecipeIngredients (quantity, unit)
├── Ingredients
```

---


