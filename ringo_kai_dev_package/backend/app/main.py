from fastapi import FastAPI

api = FastAPI(title="Ringo Kai API", version="0.1.0")


@api.get("/health", tags=["system"])
async def health_check() -> dict[str, str]:
    """Simple readiness probe so we can wire FastAPI quickly."""

    return {"status": "ok"}
