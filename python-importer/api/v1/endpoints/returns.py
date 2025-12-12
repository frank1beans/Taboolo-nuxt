from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile, status

from core import settings
from importers.helpers.text_and_measure import tokenize_description
from importers.models.raw import RawLxItem, RawMxReturn
from services.raw_import_service import SixRawImportService
from importers.registry import (
    parse_estimate_from_bytes,
    parse_excel_estimate_from_bytes,
    parse_lx_estimate_from_bytes,
    parse_mx_estimate_from_bytes,
)
from utils.rate_limit import SlidingWindowRateLimiter, enforce_rate_limit

router = APIRouter()
returns_rate_limiter = SlidingWindowRateLimiter(settings.import_rate_limit_per_minute, 60)
raw_service = SixRawImportService()


def _parse_companies_config(raw: str | None) -> list[dict[str, Any]]:
    if not raw:
        return []
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            return [entry for entry in data if isinstance(entry, dict)]
    except Exception:
        return []
    return []


def _build_computo_payload(project_id: str, estimate: Any, company_id: str | None) -> dict[str, Any]:
    return {
        "project_id": project_id,
        "company": company_id,
        "importo_totale": estimate.total_amount,
        "total_amount": estimate.total_amount,
        "items": [
            {
                "ordine": item.order,
                "progressivo": item.progressive,
                "codice": item.code,
                "descrizione": item.description,
                "unita_misura": item.unit,
                "quantita": item.quantity,
                "prezzo_unitario": item.unit_price,
                "importo": item.amount,
                "note": item.notes,
                "metadata": item.metadata or {},
                "wbs_levels": [
                    {"level": level.level, "code": level.code, "description": level.description}
                    for level in item.wbs_levels
                ],
            }
            for item in estimate.items
        ],
        "stats": estimate.stats or {},
    }


def _pick_parser(mode: str):
    mode_lower = (mode or "").strip().lower()
    if mode_lower == "mx":
        return parse_mx_estimate_from_bytes
    if mode_lower == "lx":
        return parse_lx_estimate_from_bytes
    if mode_lower == "excel":
        return parse_excel_estimate_from_bytes
    return parse_lx_estimate_from_bytes


@router.post(
    "/{commessa_id}/returns/lx",
    status_code=status.HTTP_200_OK,
)
async def import_returns_lx_raw(
    commessa_id: str,
    request: Request,
    file: UploadFile = File(...),
    sheet_name: str | None = Form(default=None),
    code_columns: str | None = Form(default=None),
    description_columns: str | None = Form(default=None),
    price_column: str | None = Form(default=None),
    quantity_column: str | None = Form(default=None),
    return_id: str | None = Form(default=None),
) -> dict[str, Any]:
    client_ip = request.client.host if request.client else "anonymous"
    enforce_rate_limit(returns_rate_limiter, client_ip)

    payload = await file.read()
    if len(payload) > settings.max_upload_size_mb * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File troppo grande",
        )

    try:
        items = raw_service.parse_lx_raw(
            file_bytes=payload,
            filename=file.filename,
            sheet_name=sheet_name,
            code_columns=(code_columns or "").split(",") if code_columns else None,
            description_columns=(description_columns or "").split(",") if description_columns else None,
            price_column=price_column or "",
            quantity_column=quantity_column,
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    return {
        "return_id": return_id,
        "items": [item.__dict__ for item in items],
        "count": len(items),
    }


@router.post(
    "/{commessa_id}/returns/mx",
    status_code=status.HTTP_200_OK,
)
async def import_returns_mx_raw(
    commessa_id: str,
    request: Request,
    file: UploadFile = File(...),
    sheet_name: str | None = Form(default=None),
    code_columns: str | None = Form(default=None),
    description_columns: str | None = Form(default=None),
    price_column: str | None = Form(default=None),
    quantity_column: str | None = Form(default=None),
    progressive_column: str | None = Form(default=None),
    return_id: str | None = Form(default=None),
) -> dict[str, Any]:
    client_ip = request.client.host if request.client else "anonymous"
    enforce_rate_limit(returns_rate_limiter, client_ip)

    payload = await file.read()
    if len(payload) > settings.max_upload_size_mb * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File troppo grande",
        )

    try:
        returns = raw_service.parse_mx_raw(
            file_bytes=payload,
            filename=file.filename,
            sheet_name=sheet_name,
            code_columns=(code_columns or "").split(",") if code_columns else None,
            description_columns=(description_columns or "").split(",") if description_columns else None,
            price_column=price_column or "",
            quantity_column=quantity_column,
            progressive_column=progressive_column,
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    return {
        "return_id": return_id,
        "items": [item.__dict__ for item in returns],
        "count": len(returns),
    }


@router.post(
    "/{commessa_id}/ritorni/batch-single-file",
    status_code=status.HTTP_200_OK,
)
async def import_ritorni_batch_single_file(
    commessa_id: str,
    request: Request,
    file: UploadFile = File(...),
    mode: str = Form(default="lx"),  # lx | mx | excel
    sheet_name: str | None = Form(default=None),
    code_columns: str | None = Form(default=None),
    description_columns: str | None = Form(default=None),
    price_column: str | None = Form(default=None),
    quantity_column: str | None = Form(default=None),
    progressive_column: str | None = Form(default=None),
    companies_config: str | None = Form(default=None),
) -> dict[str, Any]:
    client_ip = request.client.host if request.client else "anonymous"
    enforce_rate_limit(returns_rate_limiter, client_ip)

    payload = await file.read()
    if len(payload) > settings.max_upload_size_mb * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File troppo grande",
        )

    parser_fn = _pick_parser(mode)
    try:
        parsed = parser_fn(
            file_bytes=payload,
            filename=file.filename,
            sheet_name=sheet_name,
            code_columns=(code_columns or "").split(",") if code_columns else None,
            description_columns=(description_columns or "").split(",") if description_columns else None,
            price_column=price_column,
            quantity_column=quantity_column,
            progressive_column=progressive_column,
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    companies = _parse_companies_config(companies_config)
    company_id = None
    if companies:
        company_id = companies[0].get("id") or companies[0].get("name")
    key = company_id or "default"

    computi = {key: _build_computo_payload(commessa_id, parsed, company_id)}

    return {
        "success": [key],
        "failed": [],
        "total": 1,
        "success_count": 1,
        "failed_count": 0,
        "computi": computi,
    }


@router.post(
    "/{commessa_id}/ritorni",
    status_code=status.HTTP_200_OK,
)
async def import_ritorni_single(
    commessa_id: str,
    request: Request,
    file: UploadFile = File(...),
    mode: str = Form(default="lx"),  # lx | mx | excel
    sheet_name: str | None = Form(default=None),
    code_columns: str | None = Form(default=None),
    description_columns: str | None = Form(default=None),
    price_column: str | None = Form(default=None),
    quantity_column: str | None = Form(default=None),
    progressive_column: str | None = Form(default=None),
) -> dict[str, Any]:
    client_ip = request.client.host if request.client else "anonymous"
    enforce_rate_limit(returns_rate_limiter, client_ip)

    payload = await file.read()
    if len(payload) > settings.max_upload_size_mb * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File troppo grande",
        )

    parser_fn = _pick_parser(mode)
    try:
        parsed = parser_fn(
            file_bytes=payload,
            filename=file.filename,
            sheet_name=sheet_name,
            code_columns=(code_columns or "").split(",") if code_columns else None,
            description_columns=(description_columns or "").split(",") if description_columns else None,
            price_column=price_column,
            quantity_column=quantity_column,
            progressive_column=progressive_column,
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    return _build_computo_payload(commessa_id, parsed, None)
