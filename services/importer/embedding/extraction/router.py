from typing import List, Tuple, Optional, Dict
from dataclasses import dataclass
import re
from .families.registry import FAMILY_SIGNALS, WBS6_FAMILY_SIGNALS

@dataclass
class FamilyMatch:
    """Risultato del routing."""
    family_id: str
    score: float
    matched_keywords: List[str]

class FamilyRouter:
    """Router debole basato su keyword scoring."""
    
    def __init__(self, signals: Dict = None, wbs6_signals: Dict = None):
        self.signals = signals or FAMILY_SIGNALS
        self.wbs6_signals = wbs6_signals or WBS6_FAMILY_SIGNALS
        # Pre-compile regex
        self._compiled = self._compile(self.signals)
        self._compiled_wbs6 = self._compile(self.wbs6_signals)

    def _compile(self, signals: Dict) -> Dict[str, Dict[str, List[re.Pattern]]]:
        compiled = {}
        for family, config in signals.items():
            compiled[family] = {
                "primary": [re.compile(p, re.IGNORECASE) for p in config.get("primary", [])],
                "secondary": [re.compile(p, re.IGNORECASE) for p in config.get("secondary", [])],
                "negative": [re.compile(p, re.IGNORECASE) for p in config.get("negative", [])],
            }
        return compiled

    def _route_with_patterns(
        self,
        text: str,
        compiled: Dict[str, Dict[str, List[re.Pattern]]],
        top_k: int,
        min_score: float,
        saturation: float,
        require_primary: bool = False,
    ) -> List[FamilyMatch]:
        results = []
        if not text:
            return results
        text_lower = text.lower()

        for family, patterns in compiled.items():
            score = 0.0
            matched = []
            primary_hits = 0
            negative_hits = 0

            for p in patterns["primary"]:
                if p.search(text_lower):
                    score += 1.0
                    primary_hits += 1
                    matched.append(p.pattern)

            for p in patterns["secondary"]:
                if p.search(text_lower):
                    score += 0.5
                    matched.append(p.pattern)

            for p in patterns["negative"]:
                if p.search(text_lower):
                    score -= 0.5
                    negative_hits += 1

            if require_primary:
                if primary_hits == 0 or negative_hits > 0:
                    continue

            normalized_score = min(1.0, score / saturation) if saturation > 0 else 0.0

            if normalized_score >= min_score:
                results.append(FamilyMatch(
                    family_id=family,
                    score=round(normalized_score, 3),
                    matched_keywords=matched,
                ))

        results.sort(key=lambda x: x.score, reverse=True)
        return results[:top_k]
    
    def route(
        self, 
        text: str, 
        top_k: int = 2,
        min_score: float = 0.3,
    ) -> List[FamilyMatch]:
        """
        Ritorna le famiglie candidate ordinate per score.
        
        Args:
            text: Descrizione da classificare
            top_k: Numero massimo di famiglie da ritornare
            min_score: Score minimo per essere considerato
            
        Returns:
            Lista di FamilyMatch ordinata per score decrescente
        """
        return self._route_with_patterns(
            text=text,
            compiled=self._compiled,
            top_k=top_k,
            min_score=min_score,
            saturation=3.0,
            require_primary=False,
        )

    def route_wbs6(
        self,
        wbs6_text: str,
        top_k: int = 1,
        min_score: float = 0.9,
    ) -> List[FamilyMatch]:
        return self._route_with_patterns(
            text=wbs6_text,
            compiled=self._compiled_wbs6,
            top_k=top_k,
            min_score=min_score,
            saturation=1.0,
            require_primary=True,
        )
    
    def get_best_family(self, text: str, fallback: str = "core") -> str:
        """Ritorna la famiglia migliore o fallback a 'core'."""
        matches = self.route(text, top_k=1)
        return matches[0].family_id if matches else fallback

    def get_best_family_from_wbs6(self, wbs6_text: str) -> Optional[str]:
        matches = self.route_wbs6(wbs6_text, top_k=1)
        return matches[0].family_id if matches else None
