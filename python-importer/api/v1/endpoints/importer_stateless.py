from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile, status

from core import settings
from schemas_stateless import (
    SixImportReportSchema,
    SixInspectionSchema,
    SixPreventiviPreviewSchema,
    SixPreventivoOptionSchema,
)
from services.six_import_service import six_import_service
from utils.rate_limit import SlidingWindowRateLimiter, enforce_rate_limit

router = APIRouter()
import_rate_limiter = SlidingWindowRateLimiter(settings.import_rate_limit_per_minute, 60)


def _ensure_six_or_xml_file(file: UploadFile) -> None:
    if not file.filename or not file.filename.lower().endswith((".six", ".xml")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato file non supportato. Fornisci un file STR Vision (.six o .xml)",
        )


@router.post(
    "/{commessa_id}/import-six/inspect",
    response_model=SixInspectionSchema,
)
async def inspect_commessa_six(
    commessa_id: str,
    request: Request,
    file: UploadFile = File(...),
) -> SixInspectionSchema:
    _ensure_six_or_xml_file(file)
    client_ip = request.client.host if request.client else "anonymous"
    enforce_rate_limit(import_rate_limiter, client_ip)
    payload = await file.read()
    if len(payload) > settings.max_upload_size_mb * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File troppo grande",
        )
    try:
        result = six_import_service.inspect_details(payload, file.filename)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return SixInspectionSchema(**result)


@router.post(
    "/{commessa_id}/import-six/preview",
    response_model=SixPreventiviPreviewSchema,
)
async def preview_commessa_six(
    commessa_id: str,
    request: Request,
    file: UploadFile = File(...),
) -> SixPreventiviPreviewSchema:
    _ensure_six_or_xml_file(file)
    client_ip = request.client.host if request.client else "anonymous"
    enforce_rate_limit(import_rate_limiter, client_ip)
    payload = await file.read()
    if len(payload) > settings.max_upload_size_mb * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File troppo grande",
        )
    try:
        options = six_import_service.inspect_content(payload, file.filename)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return SixPreventiviPreviewSchema(
        preventivi=[
            SixPreventivoOptionSchema(
                internal_id=opt.internal_id,
                code=opt.code,
                description=opt.description,
                author=opt.author,
                version=opt.version,
                date=opt.date,
                price_list_id=opt.price_list_id,
                price_list_label=opt.price_list_label,
                rilevazioni=opt.rilevazioni,
                items=opt.items,
                total_importo=opt.total_importo,
            )
            for opt in options
        ]
    )


@router.post(
    "/{commessa_id}/import-six",
    response_model=SixImportReportSchema,
    status_code=status.HTTP_201_CREATED,
)
async def import_commessa_six(
    commessa_id: str,
    request: Request,
    file: UploadFile = File(...),
    preventivo_id: str | None = Form(default=None),
    compute_embeddings: bool = Form(default=False),
    extract_properties: bool = Form(default=False),
) -> SixImportReportSchema:
    _ensure_six_or_xml_file(file)
    client_ip = request.client.host if request.client else "anonymous"
    enforce_rate_limit(import_rate_limiter, client_ip)
    try:
        payload = await file.read()
        if len(payload) > settings.max_upload_size_mb * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="File troppo grande",
            )
        report = six_import_service.parse_only(
            file_bytes=payload,
            filename=file.filename,
            commessa_id=commessa_id,
            preventivo_id=preventivo_id,
            compute_embeddings=compute_embeddings,
            extract_properties=extract_properties,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return SixImportReportSchema(**report)
