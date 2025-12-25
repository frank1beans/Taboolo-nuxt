
# Configurazione keyword per famiglia
FAMILY_SIGNALS = {
    "cartongesso": {
        "primary": [  # peso 1.0
            r"\bcartongesso\b", r"\bgypsum\b", r"\bknauf\b", r"\bgyproc\b",
            r"\blastra\b.*\bgesso\b", r"\borditura\b", r"\bmontante\b",
        ],
        "secondary": [  # peso 0.5
            r"\bparete\b", r"\bcontrosoffitto\b", r"\brivestimento\b",
            r"\bisolamento\b", r"\blana\b.*\b(roccia|vetro)\b",
        ],
        "negative": [  # peso -0.5
            r"\bcemento\b", r"\blateriz\w+\b", r"\bmuratura\b",
        ],
    },
    "serramenti": {
        "primary": [
            r"\bporta\b", r"\bfinestra\b", r"\bserramento\b", r"\binfisso\b",
            r"\bvetro\b.*\bcamera\b", r"\bbattente\b", r"\bscorrevole\b",
        ],
        "secondary": [
            r"\btelaio\b", r"\banta\b", r"\bcerniera\b", r"\bmaniglia\b",
            r"\balluminio\b", r"\bpvc\b",
        ],
        "negative": [
            r"\bcartongesso\b", r"\bpaviment\w+\b",
        ],
    },
    "pavimenti": {
        "primary": [
            r"\bpaviment\w+\b", r"\bpiastrella\b",
            r"\bgres\b", r"\bparquet\b", r"\blaminato\b", r"\bceramic\w+\b",
        ],
        "secondary": [
            r"\bmassetto\b", r"\bsottofondo\b", r"\bposa\b", r"\bfuga\b",
            r"\bzoccolino\b", r"\bbattiscopa\b",
        ],
        "negative": [
            r"\bparete\b", r"\bsoffitto\b", r"\bporta\b", r"\brivestiment\w+\b",
        ],
    },
    "controsoffitti": {
        "primary": [
            r"\bcontrosoffitt\w+\b", r"\bbaffle\w+\b", r"\bvelett\w+\b",
        ],
        "secondary": [
            r"\bsoffitt\w+\b", r"\bpendin\w+\b", r"\bgrigliat\w+\b",
        ],
        "negative": [
            r"\bpaviment\w+\b",
        ],
    },
    "rivestimenti": {
        "primary": [
            r"\brivestiment\w+\b",
        ],
        "secondary": [
            r"\bparet\w+\b", r"\bpiastrell\w+\b", r"\bgres\b",
            r"\bceramic\w+\b", r"\bpietra\b", r"\bgomma\b",
            r"\bpvc\b", r"\blegno\b",
        ],
        "negative": [
            r"\bpaviment\w+\b",
        ],
    },
    "coibentazione": {
        "primary": [
            r"\bcoibent\w+\b", r"\bisolant\w+\b",
        ],
        "secondary": [
            r"\blana\b.*\b(roccia|vetro)\b", r"\beps\b", r"\bxps\b",
            r"\bpolistiren\w+\b", r"\bpoliuret\w+\b",
        ],
        "negative": [
            r"\bcappott\w+\b",
        ],
    },
    "impermeabilizzazione": {
        "primary": [
            r"\bimpermeabilizz\w+\b", r"\bguaina\b",
        ],
        "secondary": [
            r"\bbitumin\w+\b", r"\bresin\w+\b", r"\bliquid\w+\b",
            r"\bsintetic\w+\b",
        ],
        "negative": [],
    },
    "opere_murarie": {
        "primary": [
            r"\bmurar\w+\b", r"\blateriz\w+\b", r"\bblocchi\b",
            r"\bcalcestruzz\w+\b",
        ],
        "secondary": [
            r"\bmatton\w+\b", r"\bcls\b",
        ],
        "negative": [
            r"\bassistenze\b",
        ],
    },
    "facciate_cappotti": {
        "primary": [
            r"\bfacciat\w+\b", r"\bcappott\w+\b",
        ],
        "secondary": [
            r"\bventilat\w+\b", r"\bcurtain\b", r"\bmontant\w+\b",
            r"\btravers\w+\b", r"\bdoppia pelle\b", r"\bvetrat\w+\b",
        ],
        "negative": [
            r"\boscurant\w+\b", r"\bschermatur\w+\b",
            r"\btende\b", r"\bvenezian\w+\b",
        ],
    },
    "apparecchi_sanitari": {
        "primary": [
            r"\bsanitari\b", r"\bwc\b", r"\bbidet\b", r"\blavabo\b",
            r"\borinatoio\b", r"\brubinetteria\b", r"\bmiscelatore\b",
            r"\bcassetta\b.*\bscarico\b", r"\bpiatto doccia\b", r"\bbox doccia\b",
        ],
        "secondary": [
            r"\bspecchio\b", r"\baccessori\b.*\bbagno\b",
            r"\bporta\s*asciugamani\b", r"\bporta\s*sapone\b",
        ],
        "negative": [
            r"\bcucina\b", r"\blavello\b",
        ],
    },
}

# WBS6-driven family detection (strict, to avoid false positives)
WBS6_FAMILY_SIGNALS = {
    "cartongesso": {
        "primary": [
            r"\bcartongesso\b",
            r"\bgesso rivestito\b",
            r"\blastra\b.*\bgesso\b",
        ],
        "negative": [],
    },
    "serramenti": {
        "primary": [
            r"\bserrament\w+\b",
            r"\binfiss\w+\b",
            r"\bport\w+\b",
            r"\bfinest\w+\b",
        ],
        "negative": [],
    },
    "pavimenti": {
        "primary": [
            r"\bpaviment\w+\b",
            r"\bpiastrell\w+\b",
            r"\bgres\b",
            r"\bparquet\b",
        ],
        "negative": [],
    },
    "controsoffitti": {
        "primary": [
            r"\bcontrosoffitt\w+\b",
        ],
        "negative": [],
    },
    "rivestimenti": {
        "primary": [
            r"\brivestiment\w+\b",
        ],
        "negative": [],
    },
    "coibentazione": {
        "primary": [
            r"\bcoibent\w+\b",
            r"\bisolant\w+\b",
        ],
        "negative": [
            r"\bcappott\w+\b",
        ],
    },
    "impermeabilizzazione": {
        "primary": [
            r"\bimpermeabilizz\w+\b",
        ],
        "negative": [],
    },
    "opere_murarie": {
        "primary": [
            r"\bmurar\w+\b",
            r"\blateriz\w+\b",
            r"\bblocchi\b",
            r"\bcalcestruzz\w+\b",
        ],
        "negative": [
            r"\bassistenze\b",
        ],
    },
    "facciate_cappotti": {
        "primary": [
            r"\bfacciat\w+\b",
            r"\bcappott\w+\b",
        ],
        "negative": [
            r"\boscurant\w+\b",
            r"\bschermatur\w+\b",
            r"\btende\b",
            r"\bvenezian\w+\b",
        ],
    },
    "apparecchi_sanitari": {
        "primary": [
            r"\bapparecchi\s+sanitari\b",
            r"\bsanitari\b",
            r"\bcassett\w+\s+di\s+scarico\b",
        ],
        "negative": [],
    },
}
