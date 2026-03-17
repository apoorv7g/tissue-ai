from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from llm_service import generate_diagram_json
from schema_validator import validate_diagram_schema

app = FastAPI(title="Tissue AI", version="0.1.0")

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/generate", response_class=JSONResponse)
async def generate(
    text: str = Form(...),
    diagram_type: str = Form(...),
    api_key: str = Form(...),
):
    if not api_key.strip():
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "Groq API key is required."},
        )

    if not text.strip():
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "Input text cannot be empty."},
        )

    if diagram_type not in ("flowchart", "mindmap"):
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "Invalid diagram type."},
        )

    result = await generate_diagram_json(text.strip(), diagram_type, api_key.strip())

    if result.get("error"):
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": result["error"]},
        )

    diagram_data = result["data"]
    is_valid, validation_error = validate_diagram_schema(diagram_data, diagram_type)

    if not is_valid:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"Schema validation failed: {validation_error}",
            },
        )

    return JSONResponse(
        content={"success": True, "diagram_type": diagram_type, "data": diagram_data}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)