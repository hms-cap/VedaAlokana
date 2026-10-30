#!/usr/bin/env python3
"""Build the app's Devanagari and Kannada web fonts with stronger svara marks.

Starts from Noto Serif Devanagari and Noto Serif Kannada (SIL OFL, from
github.com/google/fonts), fixes them at regular weight, and redraws every
glyph of the svara marks so they read clearly at body size:

  ॑ svarita (U+0951) and ᳚ double svarita (U+1CDA): strokes about twice as
    thick and a quarter taller, growing upward from where they sit;
  ॒ anudātta (U+0952): bar about twice as thick, growing downward from its
    top edge, and a little wider.

All positional variants are treated the same way (marks under subscript
consonants, after a repha, combined with candrabindu), so placement by the
fonts' own positioning rules is unchanged. Only the mark outlines change.

Usage: python3 scripts/make-fonts.py <google-fonts checkout> web/fonts
Needs fontTools (pip install fonttools).
"""
import sys
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools import subset

STROKE_X = 2.0     # svarita stroke thickness
STROKE_X_DOUBLE = 1.5  # double svarita: keep a gap between its two strokes
STROKE_Y = 1.25    # svarita height
BAR_Y = 2.0        # anudātta thickness
BAR_X = 1.12       # anudātta width

SOURCES = [
    ('Devanagari', 'ofl/notoserifdevanagari/NotoSerifDevanagari[wdth,wght].ttf', {'wght': 400, 'wdth': 100},
     'U+0020-007E,U+00A0,U+0900-097F,U+1CD0-1CFF,U+A8E0-A8FF,U+200C-200D,U+2013-2014,U+2018-201D,U+25CC'),
    ('Kannada', 'ofl/notoserifkannada/NotoSerifKannada[wght].ttf', {'wght': 400},
     'U+0020-007E,U+00A0,U+0951-0952,U+0964-0965,U+0C80-0CF3,U+1CD0-1CFA,U+200C-200D,U+2013-2014,U+2018-201D,U+25CC'),
]


def is_svara_glyph(name):
    n = name.lower()
    return ('udatta' in n or 'svarita' in n or n.startswith('uni0951') or n.startswith('uni0952')
            or n.startswith('uni1cda'))


def is_below(name):
    n = name.lower()
    return 'anudatta' in n or n.startswith('uni0952')


def contours(glyph):
    start = 0
    for end in glyph.endPtsOfContours:
        yield range(start, end + 1)
        start = end + 1


def strengthen(font, name):
    glyf = font['glyf']
    g = glyf[name]
    if g.isComposite() or g.numberOfContours <= 0:
        return False  # composites follow their (strengthened) components
    coords = g.coordinates
    below = is_below(name)
    sx = STROKE_X_DOUBLE if ('double' in name.lower() or '1cda' in name.lower()) else STROKE_X
    touched = False
    for idx in contours(g):
        xs = [coords[i][0] for i in idx]
        ys = [coords[i][1] for i in idx]
        w, h = max(xs) - min(xs), max(ys) - min(ys)
        if below and h < 0.35 * w:            # horizontal anudātta bar
            cx, top = (max(xs) + min(xs)) / 2, max(ys)
            for i in idx:
                x, y = coords[i]
                coords[i] = (round(cx + (x - cx) * BAR_X), round(top - (top - y) * BAR_Y))
            touched = True
        elif not below and w < 0.6 * h:      # vertical svarita stroke
            cx, bottom = (max(xs) + min(xs)) / 2, min(ys)
            for i in idx:
                x, y = coords[i]
                coords[i] = (round(cx + (x - cx) * sx), round(bottom + (y - bottom) * STROKE_Y))
            touched = True
    if touched:
        g.recalcBounds(glyf)
    return touched


def build(root, out):
    out.mkdir(parents=True, exist_ok=True)
    for script, rel, axes, unicodes in SOURCES:
        font = TTFont(root / rel)
        font = instantiateVariableFont(font, axes)
        changed = [n for n in font.getGlyphOrder() if is_svara_glyph(n) and strengthen(font, n)]
        opts = subset.Options()
        opts.layout_features = ['*']
        opts.flavor = 'woff'
        opts.name_IDs = ['*']
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=subset.parse_unicodes(unicodes))
        sub.subset(font)
        dest = out / f'NotoSerif{script}-Vedic.woff'
        font.flavor = 'woff'
        font.save(dest)
        print(f'{dest}: strengthened {len(changed)} svara glyphs ({", ".join(changed)})')


if __name__ == '__main__':
    build(Path(sys.argv[1]), Path(sys.argv[2]))
