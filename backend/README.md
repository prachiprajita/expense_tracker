# SpendWise Backend

## Setup

Create a virtual environment:

Windows:
python -m venv .venv
.venv\Scripts\activate

macOS/Linux:
python3 -m venv .venv
source .venv/bin/activate

Install packages:

pip install -r requirements.txt

Start the API:

uvicorn main:app --reload

API:
http://127.0.0.1:8000

Swagger documentation:
http://127.0.0.1:8000/docs
