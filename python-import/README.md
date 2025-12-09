# Python Import Scripts (minimal stub)

Questa cartella è dedicata **solo** agli script Python di parsing/import (SIX/XML, Excel LC/MC). Il backend completo React/FastAPI non viene più incluso nel repo; tienilo fuori dal controllo versione (`python-backend/` è ignorato).

## Come usarla
- Metti qui soltanto i moduli necessari al parsing (es. `six_import_service.py`, parser Excel) oppure includi un submodule esterno con il parser.
- Mantieni gli ambienti virtuali fuori (`.venv` è ignorato).

## Se usi il backend esterno
- Avvia il servizio Python completo fuori dal repo e punta `PYTHON_API_BASE_URL` (Nuxt) al suo endpoint.
- Questa cartella può contenere script di utilità o wrapper client per chiamare il servizio di parsing.
