from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
from fastapi.responses import JSONResponse


app = FastAPI(title="TimeTrex Mock API", version="1.0.0")


class PayrollPreviewRequest(BaseModel):
    periodStart: Optional[str] = None
    periodEnd: Optional[str] = None


class PayrollExportRequest(BaseModel):
    periodStart: str
    periodEnd: str
    format: str
    employeeIds: Optional[List[str]] = None


@app.get("/")
def root():
    return {"service": "timetrex-mock", "status": "ok"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/v1/doc.json")
def openapi_doc():
    return JSONResponse(app.openapi())


@app.post("/api/v1/payroll/preview")
def payroll_preview(payload: PayrollPreviewRequest):
    return {
        "periodStart": payload.periodStart or "2026-03-09",
        "periodEnd": payload.periodEnd or "2026-03-15",
        "employees": 24,
        "totals": {
            "regularHours": 1280,
            "overtimeHours": 85.5,
            "grossPay": 48210.75,
        },
        "source": "timetrex-mock",
    }


@app.post("/api/v1/payroll/export")
def payroll_export(payload: PayrollExportRequest):
    return {
        "exportId": "mock-exp-001",
        "status": "QUEUED",
        "format": payload.format,
        "periodStart": payload.periodStart,
        "periodEnd": payload.periodEnd,
        "employeeCount": len(payload.employeeIds or []),
        "source": "timetrex-mock",
    }
