import pytest
from httpx import ASGITransport, AsyncClient
from backend.app.main import app


@pytest.mark.anyio
async def test_get_reflection_metadata():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.get("/api/v1/reflections/metadata")
        assert res.status_code == 200
        data = res.json()
        assert data["question_count"] == 160
        assert "Reflection and Mental Check-In Questions" in data["title"]
        assert len(data["categories"]) == 14
        assert len(data["source_notes"]) >= 4
        assert "not a diagnostic tool" in data["usage_note"]


@pytest.mark.anyio
async def test_get_reflection_categories():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.get("/api/v1/reflections/categories")
        assert res.status_code == 200
        cats = res.json()
        assert len(cats) == 14
        total_questions = sum(c["count"] for c in cats)
        assert total_questions == 160
        cat_names = [c["name"] for c in cats]
        assert "Daily Mental Check-In" in cat_names
        assert "Grounding and Gentle Distraction" in cat_names
        assert "Questions About Your Emotions" in cat_names


@pytest.mark.anyio
async def test_get_daily_reflection_deterministic():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res1 = await client.get("/api/v1/reflections/daily")
        assert res1.status_code == 200
        data1 = res1.json()
        assert data1["id"] >= 1 and data1["id"] <= 160
        assert len(data1["question"]) > 0
        assert len(data1["category"]) > 0
        assert data1["date"] is not None

        # Repeat call on same day should return identical question
        res2 = await client.get("/api/v1/reflections/daily")
        assert res2.status_code == 200
        data2 = res2.json()
        assert data1["id"] == data2["id"]
        assert data1["question"] == data2["question"]


@pytest.mark.anyio
async def test_get_random_reflection():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.get("/api/v1/reflections/random?_t=99999")
        assert res.status_code == 200
        data = res.json()
        assert data["id"] >= 1 and data["id"] <= 160
        assert len(data["question"]) > 0

        # Filter by category
        res_cat = await client.get("/api/v1/reflections/random?category=Grounding%20and%20Gentle%20Distraction")
        assert res_cat.status_code == 200
        data_cat = res_cat.json()
        assert data_cat["category"] == "Grounding and Gentle Distraction"

        # Exclude ID
        first_id = data["id"]
        res_ex = await client.get(f"/api/v1/reflections/random?exclude_id={first_id}&_t=88888")
        assert res_ex.status_code == 200
        data_ex = res_ex.json()
        assert data_ex["id"] != first_id


@pytest.mark.anyio
async def test_get_all_reflections():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.get("/api/v1/reflections/all")
        assert res.status_code == 200
        all_q = res.json()
        assert len(all_q) == 160

        # Filtered by category
        res_filt = await client.get("/api/v1/reflections/all?category=Daily%20Mental%20Check-In")
        assert res_filt.status_code == 200
        filt_q = res_filt.json()
        assert len(filt_q) == 10
        for item in filt_q:
            assert item["category"] == "Daily Mental Check-In"

