from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
from routers import properties, analysis

app = FastAPI(title="Property Analyzer", version="1.0.0")

app.include_router(properties.router)
app.include_router(analysis.router)

# Serve React build in production
_static = Path(__file__).parent.parent / "frontend" / "dist"
if _static.exists():
    app.mount("/assets", StaticFiles(directory=str(_static / "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        return FileResponse(str(_static / "index.html"))
