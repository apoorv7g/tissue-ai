from __future__ import annotations


def _font_css_url(family: str) -> str:
    return f"https://fonts.googleapis.com/css2?family={family.replace(' ', '+')}:wght@400;500;700&display=swap"


CURATED_FONT_FAMILIES: tuple[str, ...] = (
    'Inter',
    'Manrope',
    'Space Grotesk',
    'DM Sans',
    'Plus Jakarta Sans',
    'Outfit',
    'Poppins',
    'Urbanist',
    'Sora',
    'Rubik',
    'Lato',
    'Nunito',
    'Work Sans',
    'Source Sans 3',
    'Figtree',
    'Merriweather',
    'Lora',
    'Playfair Display',
    'Libre Baskerville',
    'PT Serif',
    'Roboto Slab',
    'IBM Plex Sans',
    'IBM Plex Serif',
    'M PLUS 1p',
    'Noto Sans',
    'Noto Serif',
    'Bebas Neue',
    'Archivo Black',
    'Righteous',
    'Fira Sans',
    'Fira Code',
    'JetBrains Mono',
    'Space Mono',
)


FONTS: list[dict[str, str]] = [
    {'family': family, 'css_url': _font_css_url(family)}
    for family in CURATED_FONT_FAMILIES
]


def search_fonts(query: str) -> list[dict[str, str]]:
    q = query.strip().lower()
    if not q:
        return FONTS[:30]

    matched = [font for font in FONTS if q in font['family'].lower()]
    return matched[:30]
