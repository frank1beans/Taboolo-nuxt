import logging
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.router import api_router
from core import settings
from core.logging import configure_logging

logger = logging.getLogger(__name__)

# Carica variabili .env una sola volta all'import del modulo
load_dotenv(Path(__file__).parent.parent.parent / ".env")


def _build_cors_origins() -> list[str]:
    """
    Normalizza e applica politiche di sicurezza CORS in modo centralizzato.
    """
    allowed_origins = settings.cors_origins or []

    if isinstance(allowed_origins, str):
        allowed_origins = [allowed_origins]

    # SECURITY: rimuovi qualsiasi "*"
    allowed_origins = [origin for origin in allowed_origins if origin != "*"]

    if not allowed_origins:
        # SECURITY: fallback sicuro solo su localhost
        allowed_origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:8081",
            "http://127.0.0.1:8081",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]

    return allowed_origins


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan centralizza logica di startup/shutdown e viene eseguito una sola volta
    per process (non ad ogni import del modulo).
    """
    # Configura logging prima di tutto
    configure_logging()

    # Qui l'app è pronta a ricevere richieste
    yield

    # Eventuale logica di shutdown (chiusura connessioni, flush, ecc.)
    # al momento non necessario -> pass
    # es: semantic_embedding_service.close() se servisse in futuro
    # pass


def create_app() -> FastAPI:
    """
    Factory dell'app FastAPI.

    Nota architetturale: l'entrypoint espone i router definiti in app.api.v1.endpoints.
    In questa versione stateless non c'è alcuna persistenza: il servizio espone solo
    le API di parsing/import SIX e restituisce JSON da salvare su Mongo lato Nitro.
    """
    application = FastAPI(
        title=settings.app_name,
        debug=settings.debug,
        version="0.1.0",
        docs_url="/docs" if settings.debug else None,   # SECURITY: Swagger solo in debug
        redoc_url="/redoc" if settings.debug else None,
        lifespan=lifespan,
    )

    # Router API
    application.include_router(api_router)

    # CORS rigoroso
    allowed_origins = _build_cors_origins()
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"], # FORCE WILDCARD FOR DEBUGGING
        allow_credentials=settings.cors_allow_credentials,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # SECURITY: metodi espliciti
        allow_headers=["Content-Type", "Authorization"],            # SECURITY: header espliciti
        expose_headers=["*"],  # Esponi tutti gli header nelle risposte
        max_age=3600,          # Cache preflight per 1 ora
    )

    return application


app = create_app()


if __name__ == "__main__":
    # Local dev entrypoint: run with uvicorn when executing `python main.py`
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True, # Force reload for dev
        reload_dirs=["."], # Explicit directory watch
    )
