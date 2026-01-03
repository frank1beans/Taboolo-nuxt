import json
import logging
import os
from typing import Optional, Dict, Any
import httpx
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

EXTRACTION_PROMPT = """
Sei un esperto di costruzioni edili. Estrai le proprietà tecniche dalla descrizione seguente.

=== REGOLE TASSATIVE ===
1. Estrai SOLO informazioni ESPLICITAMENTE presenti nel testo
2. Per ogni proprietà devi fornire:
   - value: il valore estratto (può essere una stringa, un numero, o una LISTA se ci sono più valori)
   - evidence: la SUBSTRING ESATTA del testo da cui hai estratto (può essere una lista se ci sono più evidenze)
   - confidence: float 0.0-1.0 (1.0 = esplicitamente scritto, 0.5 = inferito da contesto)
3. Se un'informazione NON è presente, usa null per value
4. NON inventare valori. Se sei incerto, abbassa la confidence sotto 0.5
5. L'evidence deve essere una COPIA LETTERALE del testo, non una parafrasi

=== MULTI-LAYER ITEMS ===
Se la descrizione contiene PIÙ strati (es. più lastre, più isolanti), restituisci una LISTA di valori.
Esempio per una parete con doppia lastra:
  "board_type": {{"value": ["GKB standard", "Diamant antincendio"], "evidence": ["tipo \\"Knauf GKB\\"", "tipo \\"Knauf Diamant\\""], "confidence": 1.0}}
  "thickness_mm": {{"value": [12.5, 12.5], "evidence": ["Sp. 12,5 mm", "Sp. 12,5 mm"], "confidence": 1.0}}

=== FORMATO OUTPUT ===
Rispondi SOLO con JSON valido, senza markdown code blocks, senza commenti.

=== SCHEMA DA COMPILARE ===
{schema_json}

=== DESCRIZIONE DA ANALIZZARE ===
{description}

=== CONTESTO AGGIUNTIVO (opzionale) ===
Famiglia tecnica: {family}
Categoria WBS6: {wbs6}

=== JSON OUTPUT ===
"""

class LLMExtractor:
    """Estrattore LLM con validazione JSON e retry."""
    
    def __init__(
        self,
        provider: str = "openai",  # "openai" | "anthropic"
        model: str = "gpt-4o-mini",
        api_key: Optional[str] = None,
        max_retries: int = 2,
    ):
        # Ensure env is loaded
        # Path: services/importer/embedding/extraction/llm_extractor.py -> ... -> Taboolo-nuxt/.env
        load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))), ".env"))
        
        self.provider = provider
        self.model = model
        
        # Determine API key based on provider
        if provider == "openai":
            self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        elif provider == "anthropic":
             self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        elif provider == "google":
             self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        elif provider == "mistral":
             self.api_key = api_key or os.getenv("MISTRAL_API_KEY")
        else:
             self.api_key = api_key
        self.max_retries = max_retries
        
        if self.provider != "ollama" and not self.api_key:
            logger.warning(f"No API key found for provider {provider}. Extraction will fail.")
        
    def extract(
        self,
        description: str,
        schema: Dict[str, Any],
        family: str = "core",
        wbs6: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Estrae proprietà dalla descrizione usando LLM.
        
        """
        if self.provider != "ollama" and not self.api_key:
            return schema # Return empty template

        prompt = EXTRACTION_PROMPT.format(
            schema_json=json.dumps(schema, indent=2, ensure_ascii=False),
            description=description,
            family=family,
            wbs6=wbs6 or "N/A",
        )
        
        for attempt in range(self.max_retries + 1):
            try:
                raw_response = self._call_llm(prompt)
                parsed = self._parse_json(raw_response)
                validated = self._validate_response(parsed, schema)
                return validated
            except Exception as e:
                logger.warning(f"Extraction attempt {attempt + 1} failed: {e}")
                if attempt == self.max_retries:
                    logger.error(f"All extraction attempts failed for: {description[:100]}")
                    return schema  # Return empty schema
        
        return schema
    
    def _call_llm(self, prompt: str) -> str:
        """Chiamata API al provider LLM."""
        if self.provider == "openai":
            return self._call_openai(prompt)
        elif self.provider == "anthropic":
            return self._call_anthropic(prompt)
        elif self.provider == "ollama":
            return self._call_ollama(prompt)
        elif self.provider == "google":
            return self._call_google(prompt)
        elif self.provider == "mistral":
            return self._call_mistral(prompt)
        else:
            raise ValueError(f"Unknown provider: {self.provider}")
    
    def _call_openai(self, prompt: str) -> str:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,  # Basso per output deterministico
                    "response_format": {"type": "json_object"},
                },
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]
    
    def _call_anthropic(self, prompt: str) -> str:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "max_tokens": 1024,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            response.raise_for_status()
            return response.json()["content"][0]["text"]

    def _call_ollama(self, prompt: str) -> str:
        # Default to localhost
        base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        with httpx.Client(timeout=60.0) as client:
            response = client.post(
                f"{base_url}/api/chat",
                json={
                    "model": self.model, # e.g. "llama3" or "mistral"
                    "messages": [{"role": "user", "content": prompt}],
                    "format": "json", # Force JSON mode if supported by model
                    "stream": False
                },
            )
            response.raise_for_status()
            return response.json()["message"]["content"]

    def _call_google(self, prompt: str) -> str:
        # Google Gemini API
        # Ensure model name doesn't double 'models/' prefix if passed, though usually user passes just 'gemini-1.5-flash'
        model_name = self.model
        if not model_name.startswith("models/"):
             model_name = f"models/{model_name}"

        url = f"https://generativelanguage.googleapis.com/v1beta/{model_name}:generateContent?key={self.api_key}"
        
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                url,
                headers={"Content-Type": "application/json"},
                json={
                    "contents": [{
                        "parts": [{"text": prompt}]
                    }],
                    "generationConfig": {
                        "temperature": 0.1,
                        "responseMimeType": "application/json"
                    }
                }
            )
            if response.status_code != 200:
                 logger.error(f"Gemini API Error {response.status_code}: {response.text}")
                 response.raise_for_status()
                 
            # Parse Gemini response structure
            try:
                return response.json()["candidates"][0]["content"]["parts"][0]["text"]
            except KeyError:
                logger.error(f"Unexpected Gemini response format: {response.text}")
                raise

    def _call_mistral(self, prompt: str) -> str:
        """Call Mistral AI API."""
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                "https://api.mistral.ai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                    "response_format": {"type": "json_object"},
                },
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]
    
    def _parse_json(self, raw: str) -> Dict:
        """Parse JSON con cleanup."""
        # Rimuovi markdown code blocks se presenti
        clean = raw.strip()
        if clean.startswith("```"):
            parts = clean.split("```")
            if len(parts) >= 2:
                clean = parts[1]
            if clean.startswith("json"):
                clean = clean[4:]
        clean = clean.strip()
        return json.loads(clean)
    
    def _validate_response(self, parsed: Dict, schema: Dict) -> Dict:
        """Valida e normalizza la risposta."""
        result = {}
        for key, template in schema.items():
            if key in parsed:
                slot = parsed[key]
                # Validazione confidence
                try:
                    conf = float(slot.get("confidence", 0))
                except (ValueError, TypeError):
                    conf = 0.0
                
                conf = max(0.0, min(1.0, conf))
                
                result[key] = {
                    "value": slot.get("value"),
                    "evidence": slot.get("evidence"),
                    "confidence": conf,
                }
            else:
                result[key] = template
        return result
