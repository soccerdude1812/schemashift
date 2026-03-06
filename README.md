# SchemaShift

AI-powered schema drift detection and data quality monitoring for CSV/tabular data pipelines.

## Architecture

- **Frontend**: Next.js 14 + Tailwind CSS + shadcn/ui (deployed on Vercel)
- **Backend**: Python FastAPI + scikit-learn + datasketch (deployed on HuggingFace Spaces)
- **Database**: Supabase (Postgres + Auth)

## Setup

### Frontend

```bash
cd frontend
cp ../.env.example .env.local
npm install
npm run dev
```

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 7860
```

## Environment Variables

See `.env.example` for all required environment variables.
