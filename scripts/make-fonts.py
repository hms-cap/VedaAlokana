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

Usage: python3 scripts/make-fonts.py <google-fonts checkout> web/fonts [--audit DIR]
Needs fontTools (pip install fonttools).

--audit DIR also writes, per script, two TrueType fonts with identical shaping
and positioning: *-anu.ttf draws only the anudātta marks, *-rest.ttf draws
everything else. scripts/audit-marks.mjs renders every accented word of the
data with both and measures the real gap between each anudātta and the
letters above it.
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
BAR_X = {'Devanagari': 1.0, 'Kannada': 1.12}  # anudātta width (Devanagari stays narrow: ु/ू of the previous letter reach under it)
# Extra drop for the anudātta (font units), so it clears subscript consonants
# (ottakshara). Tuned with scripts/audit-marks.mjs.
ANU_DROP = {'Devanagari': 165, 'Kannada': 110}

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


def strengthen(font, name, drop=0, bar_x=1.0):
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
                coords[i] = (round(cx + (x - cx) * bar_x), round(top - (top - y) * BAR_Y) - drop)
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


def deepen_kannada_stacks(font):
    """Use the font's lowest anudātta under every stack that holds a deep subscript.

    Noto Serif Kannada lowers ॒ under a deep subscript (ಕ್ಷ, ಜ್ಞ, ಛ, ಢ ...) only
    when that subscript comes right before the mark. When another subscript
    follows it (ಙ್ಕ್ಷ್ವ॒, ನ್ಕ್ಷ್ಮ॒) the plain bar was used and ran through the
    deep one. These rules extend the font's own `blws` context to one or two
    following subscripts, reusing its .lower substitution."""
    from fontTools.otlLib.builder import buildCoverage
    from fontTools.ttLib.tables import otTables as ot
    gsub = font['GSUB'].table
    order = font.getGlyphOrder()
    below = [g for g in order if g.endswith('_kannada.below')]
    host = None
    for lk in gsub.LookupList.Lookup:
        for st in lk.SubTable:
            t = st.ExtSubTable if lk.LookupType == 7 else st
            if getattr(t, 'Format', None) == 3 and hasattr(t, 'InputCoverage') \
                    and any('anudatta' in g for c in t.InputCoverage for g in c.glyphs) \
                    and any('k_ssa_kannada.below' in c.glyphs for c in t.BacktrackCoverage):
                host, lower, deep_rule = lk, t.SubstLookupRecord[0].LookupListIndex, t
    if host is None:
        print('Kannada: anudātta context rule not found; stacks left as they are')
        return
    deep = set()
    for lk in [host]:
        for st in lk.SubTable:
            t = st.ExtSubTable if lk.LookupType == 7 else st
            if t.SubstLookupRecord[0].LookupListIndex == lower:
                for c in t.BacktrackCoverage:
                    deep |= {g for g in c.glyphs if g != 'ra_kannada.below'}
    gmap = font.getReverseGlyphMap()
    deep = sorted(deep, key=gmap.get)
    below = sorted(below, key=gmap.get)
    for n in (1, 2):
        t = ot.ChainContextSubst()
        t.Format = 3
        t.BacktrackGlyphCount = n + 1
        t.BacktrackCoverage = [buildCoverage(below, gmap) for _ in range(n)] + [buildCoverage(deep, gmap)]
        t.InputGlyphCount = 1
        t.InputCoverage = [buildCoverage(deep_rule.InputCoverage[0].glyphs, gmap)]
        t.LookAheadGlyphCount = 0
        t.LookAheadCoverage = []
        rec = ot.SubstLookupRecord()
        rec.SequenceIndex, rec.LookupListIndex = 0, lower
        t.SubstCount, t.SubstLookupRecord = 1, [rec]
        if host.LookupType == 7:
            ext = ot.ExtensionSubst()
            ext.Format, ext.ExtensionLookupType, ext.ExtSubTable = 1, 6, t
            host.SubTable.append(ext)
        else:
            host.SubTable.append(t)
    host.SubTableCount = len(host.SubTable)
    print(f'Kannada: .lower anudātta after a deep subscript followed by 1-2 more ({len(deep)} deep forms)')


def blank(font, names):
    from fontTools.ttLib.tables._g_l_y_f import Glyph
    glyf = font['glyf']
    for n in names:
        glyf[n] = Glyph()


def audit_fonts(font, script, adir):
    import copy
    adir.mkdir(parents=True, exist_ok=True)
    glyf = font['glyf']
    anu = {n for n in font.getGlyphOrder() if is_below(n)}
    # composites built from an anudātta (e.g. candrabindu + anudātta) count as anudātta
    anu |= {n for n in font.getGlyphOrder() if glyf[n].isComposite()
            and any(c.glyphName in anu for c in glyf[n].components)}
    for tag, drop in (('anu', set(font.getGlyphOrder()) - anu - {'.notdef'}), ('rest', anu)):
        f = copy.deepcopy(font)
        f.flavor = None
        blank(f, drop)
        f.save(adir / f'{script}-{tag}.ttf')
    print(f'{adir}: audit fonts for {script} ({len(anu)} anudātta glyphs)')


def build(root, out, adir=None):
    out.mkdir(parents=True, exist_ok=True)
    for script, rel, axes, unicodes in SOURCES:
        font = TTFont(root / rel)
        font = instantiateVariableFont(font, axes)
        if script == 'Kannada':
            deepen_kannada_stacks(font)
        changed = [n for n in font.getGlyphOrder() if is_svara_glyph(n) and strengthen(font, n, ANU_DROP[script], BAR_X[script])]
        opts = subset.Options()
        opts.layout_features = ['*']
        opts.flavor = 'woff'
        opts.name_IDs = ['*']
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=subset.parse_unicodes(unicodes))
        sub.subset(font)
        if adir:
            audit_fonts(font, script, adir)
        dest = out / f'NotoSerif{script}-Vedic.woff'
        font.flavor = 'woff'
        font.save(dest)
        print(f'{dest}: strengthened {len(changed)} svara glyphs ({", ".join(changed)})')


if __name__ == '__main__':
    args = sys.argv[1:]
    adir = None
    if '--audit' in args:
        i = args.index('--audit')
        adir = Path(args[i + 1])
        del args[i:i + 2]
    build(Path(args[0]), Path(args[1]), adir)
