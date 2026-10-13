import pytest
from httpx import ASGITransport, AsyncClient
from backend.app.main import app


@pytest.mark.anyio
async def test_get_random_quote():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.get("/api/v1/quotes/random?_t=123456789")
        assert res.status_code == 200
        assert "no-cache" in res.headers.get("Cache-Control", "")
        data = res.json()
        assert "quote" in data and len(data["quote"]) > 0
        assert "author" in data and len(data["author"]) > 0
        assert "category" in data and len(data["category"]) > 0
        assert "primary_text" in data
        assert "secondary_text" in data
        assert "collection" in data
        assert "aphorism_number" in data

        # Test exclude parameter ensures variance
        current_quote = data["quote"]
        res_ex = await client.get(f"/api/v1/quotes/random?exclude={current_quote}&_t=987654321")
        assert res_ex.status_code == 200
        data_ex = res_ex.json()
        assert data_ex["quote"] != current_quote


@pytest.mark.anyio
async def test_get_daily_quote_deterministic():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res1 = await client.get("/api/v1/quotes/daily")
        assert res1.status_code == 200
        data1 = res1.json()
        assert "quote" in data1 and len(data1["quote"]) > 0
        assert "author" in data1 and len(data1["author"]) > 0
        assert "category" in data1 and len(data1["category"]) > 0
        assert "primary_text" in data1
        assert "secondary_text" in data1
        assert data1["date"] is not None

        # Consecutive call on same day must return the exact same deterministic daily quote
        res2 = await client.get("/api/v1/quotes/daily")
        assert res2.status_code == 200
        data2 = res2.json()
        assert data1["quote"] == data2["quote"]
        assert data1["author"] == data2["author"]
        assert data1["aphorism_number"] == data2["aphorism_number"]


@pytest.mark.anyio
async def test_get_all_aphorisms_collection():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.get("/api/v1/quotes/all")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) >= 10
        # Verify first item contains expected structure
        first = data[0]
        assert "primary_text" in first
        assert "secondary_text" in first
        assert "collection" in first
        assert "aphorism_number" in first
