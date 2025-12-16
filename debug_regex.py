import re
import sys

# Usage: python debug_regex.py <xml_file>

if len(sys.argv) < 2:
    print("Usage: python debug_regex.py <xml_file>")
    sys.exit(1)

file_path = sys.argv[1]

_reference_pattern = re.compile(
    r"(?:voce|rif\.?|riferimento|prog\.?|progressivo)\s*(?:n\.|nr\.?|num\.?)?\s*(\d+)|"  # voce n. 123, rif. 123, prog. 123
    r"#(\d+)|"  # #123
    r"→\s*(\d+)|"  # → 123
    r"\[(\d+)\]|"  # [123]
    r"<(\d+)>",  # <123>
    re.IGNORECASE
)

current_preventivo = "None"
count = 0
with open(file_path, "r", encoding="utf-8") as f:
    for line in f:
        if "<preventivo " in line:
            # simple parse
            match_id = re.search(r'preventivoId="([^"]+)"', line)
            match_desc = re.search(r'prvDescrizione[^>]*breve="([^"]+)"', line)
            pid = match_id.group(1) if match_id else "?"
            desc = match_desc.group(1) if match_desc else "?"
            current_preventivo = f"{pid} ({desc})"
            print(f"--- Entering Preventivo: {current_preventivo} ---")

        matches = _reference_pattern.findall(line)
        for match in matches:
            # multiple groups, filter explicitly empty
            ref = next((g for g in match if g), None)
            if ref:
                print(f"[{current_preventivo}] Found Reference: {ref} in line: {line.strip()[:100]}...")
                count += 1
                if count > 50:
                    print("... stopping after 50 matches")
                    sys.exit(0)

if count == 0:
    print("No matches found.")
