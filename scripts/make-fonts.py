#!/usr/bin/env python3
"""Build the app's Devanagari and Kannada web fonts.

Starts from Noto Serif Devanagari, Noto Serif Kannada (SIL OFL, from
github.com/google/fonts) and Shobhika (SIL OFL, IIT Bombay; its release .otf),
fixes them at regular weight, and for each writes two web fonts:

  *-Vedic.woff  svara marks redrawn to read clearly at body size:
                ॑ svarita (U+0951) and ᳚ double svarita (U+1CDA): strokes about
                twice as thick and a quarter taller, growing upward;
                ॒ anudātta (U+0952): bar about twice as thick, growing downward;
  *-Std.woff    the font's own marks ("Standard" in Settings).

In both, every anudātta is placed at one depth under the line (LEVEL). The source
fonts hang it from each letter's own bottom, so along a line it stepped up and
down; see level_anudatta().

Usage: python3 scripts/make-fonts.py <google-fonts checkout> web/fonts [--shobhika DIR] [--audit DIR]
Needs fontTools (pip install fonttools).

--audit DIR also writes, per font, two TrueType fonts with identical shaping
and positioning: *-anu.ttf draws only the anudātta marks, *-rest.ttf draws
everything else. scripts/audit-marks.mjs renders every accented word of the
data with both and measures the depth of each bar and the real gap between it
and the letters above it.
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
# Where the top of every anudātta sits, in font units below the baseline: deep enough
# to clear ु ू ृ and subscript consonants (ottakshara), so the bars run in one even
# line. Tuned with scripts/audit-marks.mjs. ANU_GAP: the least room kept under a
# letter that reaches deeper still (the bar then drops just for that letter).
LEVEL = {'NotoSerifDevanagari': 400, 'NotoSerifKannada': 550, 'Shobhika': 420}
# The font's own choice of a lower bar after Kannada's deepest subscripts (ಕ್ಷ, ಜ್ಞ) is kept, one level for all.
DEEP = {'NotoSerifKannada': {'anudatta_deva.lower': 770}}
ANU_GAP = 60

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


def anu_family(font):
    """The anudātta glyph the cmap gives, and every glyph a substitution can make from it."""
    cm = font.getBestCmap()
    base = cm.get(0x0952)
    fam = {g for g in font.getGlyphOrder() if is_below(g)}
    return base, fam


def glyph_bounds(font, name):
    from fontTools.pens.boundsPen import BoundsPen
    gs = font.getGlyphSet()
    pen = BoundsPen(gs)
    gs[name].draw(pen)
    return pen.bounds


def letter_roots(font):
    """Glyphs a ligature substitution makes from a letter and a sign: {ligature: the letter}.
    Follows chains (ಜೊ = ಜೆ + ೂ, ಜೆ = ಜ + ೆ) back to the plain letter, which the fused glyph
    draws at its own origin."""
    first = {}
    for lk in font['GSUB'].table.LookupList.Lookup:
        for st in lk.SubTable:
            t = st.ExtSubTable if lk.LookupType == 7 else st
            for k, ls in (getattr(t, 'ligatures', None) or {}).items():
                for l in ls:
                    first.setdefault(l.LigGlyph, k)
    gdef = font['GDEF'].table.GlyphClassDef.classDefs
    roots = {}
    for g in [g for g in first if gdef.get(g) == 1]:   # base glyphs only (not the reph, ottus or marks)
        r, seen = first[g], {g}
        while r in first and r not in seen:
            seen.add(r); r = first[r]
        roots[g] = r
    return roots


def level_anudatta(font, level, gap, deep=None, under_letter=False):
    """Put every anudātta at one height under the line.

    The source fonts hang the bar from each letter's own bottom: under ु, a
    subscript or a deep conjunct it drops, elsewhere it rises, so in running text
    the bars step up and down. Here the bar is drawn with its top at `level`
    (font units below the baseline) whatever letter it follows. It goes lower only
    under a letter whose own ink reaches deeper (keeping `gap` clear), and for the
    variants in `deep` ({glyph: level}), which the font itself picks after its
    deepest subscripts (Kannada ಕ್ಷ, ಜ್ಞ).

      GSUB: rules that swap the anudātta for another variant, or fuse it with a
            neighbouring sign (ु + ॒, ः + ॒ ...), are dropped, so the bar stays one glyph;
      GPOS: in mark-to-base / mark-to-ligature each kept bar gets a class of its own,
            anchored at its level under every base (bases the font had left out
            included, the bar centred on them); mark-to-mark (the bar hung from ु,
            a subscript ...) no longer applies to it.

    under_letter (Kannada): a letter fused with its vowel sign (ಜಾ ಪು ಪೂ ವೋ ಜೊ ...) or its
    halant is one wide glyph, and the bar sat under the middle of the whole, i.e. under the
    vowel sign, half under the next letter. It now takes the place it has under the letter
    alone (ಜ, ಪ, ವ), as Kannada books print it.
    """
    from fontTools.ttLib.tables import otTables as ot
    deep = deep or {}
    base, fam = anu_family(font)
    bars = {base: level, **{g: lv for g, lv in deep.items() if g in fam}}
    others = fam - set(bars)
    dropped = 0
    # --- GSUB: keep the plain bar
    for lk in font['GSUB'].table.LookupList.Lookup:
        for st in lk.SubTable:
            t = st.ExtSubTable if lk.LookupType == 7 else st
            if hasattr(t, 'mapping'):
                outs = lambda v: v if isinstance(v, list) else [v]
                # anything that yields another variant or a fused form goes; rules that only move
                # the bar (Kannada swaps it with reph / length / anusvāra to reorder it) stay
                for k in [k for k, v in t.mapping.items() if any(o in others for o in outs(v))]:
                    del t.mapping[k]; dropped += 1
            if hasattr(t, 'ligatures'):
                for k in list(t.ligatures):
                    keep = [l for l in t.ligatures[k] if l.LigGlyph not in others]
                    dropped += len(t.ligatures[k]) - len(keep)
                    if keep: t.ligatures[k] = keep
                    else: del t.ligatures[k]
            if hasattr(t, 'alternates'):
                for k in [k for k in t.alternates if k in bars]:
                    del t.alternates[k]; dropped += 1
    # --- GPOS
    def anchor(x, y):
        a = ot.Anchor(); a.Format = 1; a.XCoordinate = round(x); a.YCoordinate = round(y); return a
    bottoms = {}
    def bottom(g):
        if g not in bottoms:
            b = glyph_bounds(font, g); bottoms[g] = b[1] if b else 0
        return bottoms[g]
    gdef = font['GDEF'].table.GlyphClassDef.classDefs if 'GDEF' in font else {}
    hmtx = font['hmtx'].metrics
    spacing = [g for g in font.getGlyphOrder() if gdef.get(g, 1) in (1, 2) and hmtx[g][0] > 0 and not g.startswith('.')]
    n_base = n_added = n_mm = n_moved = 0
    for lk in font['GPOS'].table.LookupList.Lookup:
        for st in lk.SubTable:
            t = st.ExtSubTable if lk.LookupType == 9 else st
            ty = t.LookupType if lk.LookupType == 9 else lk.LookupType
            if ty in (4, 5):
                cov = t.MarkCoverage.glyphs
                mine = [g for g in bars if g in cov]
                if not mine: continue
                cls = {}
                for g in mine:
                    rec = t.MarkArray.MarkRecord[cov.index(g)]
                    cls[g] = (rec.Class, t.ClassCount)
                    rec.Class = t.ClassCount
                    t.ClassCount += 1
                    rec.MarkAnchor = anchor(rec.MarkAnchor.XCoordinate, glyph_bounds(font, g)[3])
                y = lambda g, lv: min(-lv, bottom(g) - gap)
                if ty == 4:
                    for g, br in zip(t.BaseCoverage.glyphs, t.BaseArray.BaseRecord):
                        for m in mine:
                            a = br.BaseAnchor[cls[m][0]]
                            br.BaseAnchor.append(anchor(a.XCoordinate, y(g, bars[m])) if a else None)
                        n_base += 1
                    # letters the font gave no anchor at all: centre the bar under them
                    have = set(t.BaseCoverage.glyphs)
                    for g in [g for g in spacing if g not in have]:
                        br = ot.BaseRecord()
                        br.BaseAnchor = [None] * (t.ClassCount - len(mine)) + [anchor(hmtx[g][0] / 2, y(g, bars[m])) for m in mine]
                        t.BaseCoverage.glyphs.append(g); t.BaseArray.BaseRecord.append(br)
                        n_added += 1
                    if under_letter:
                        recs = dict(zip(t.BaseCoverage.glyphs, t.BaseArray.BaseRecord))
                        for g, root in letter_roots(font).items():
                            if g in recs and root in recs:
                                for m in mine:
                                    a, r = recs[g].BaseAnchor[-len(mine) + list(mine).index(m)], recs[root].BaseAnchor[-len(mine) + list(mine).index(m)]
                                    if a and r: a.XCoordinate = r.XCoordinate; n_moved += 1
                    order = font.getReverseGlyphMap()
                    pairs = sorted(zip(t.BaseCoverage.glyphs, t.BaseArray.BaseRecord), key=lambda p: order[p[0]])
                    t.BaseCoverage.glyphs = [p[0] for p in pairs]; t.BaseArray.BaseRecord = [p[1] for p in pairs]
                    t.BaseArray.BaseCount = len(pairs)
                else:
                    for g, la in zip(t.LigatureCoverage.glyphs, t.LigatureArray.LigatureAttach):
                        for cr in la.ComponentRecord:
                            for m in mine:
                                a = cr.LigatureAnchor[cls[m][0]]
                                cr.LigatureAnchor.append(anchor(a.XCoordinate, y(g, bars[m])) if a else None)
            elif ty == 6:
                cov = t.Mark1Coverage.glyphs
                for g in [g for g in bars if g in cov]:
                    i = cov.index(g)
                    del cov[i]; del t.Mark1Array.MarkRecord[i]
                    t.Mark1Array.MarkCount = len(t.Mark1Array.MarkRecord)
                    n_mm += 1
    print(f'  anudātta at {level} units below the baseline{" (" + ", ".join(f"{g} {v}" for g, v in deep.items()) + ")" if deep else ""}: '
          f'{dropped} substitutions dropped, {n_base} base anchors set, {n_added} bases added, '
          f'removed from {n_mm} mark-to-mark subtables' + (f', {n_moved} fused letters anchored under the letter' if under_letter else ''))


def visarga_swap(font):
    """Kannada: let a svara mark after a visarga move in front of it, as it already does after ಂ.

    The font hangs a svara mark from the glyph before it. After ಂ, the reph and the length
    mark ೕ it swaps the two (blws: [ಂ, mark] → [mark, ಂ], then reph, then ೕ), so the mark
    reaches the letter. ಃ had no such rule, so in ತೀಃ॒, ನೋಃ॒, ರ್ಯಃ॒ the anudātta stopped at ೕ or the
    reph and sat at the end of the letter, half under the next one. This adds ಃ to the
    anusvāra rule: it takes the same slot in the syllable, so the later swaps carry the mark on.
    """
    from fontTools.ttLib.tables import otTables as ot
    import copy
    cm = font.getBestCmap()
    anus, vis = cm.get(0x0C82), cm.get(0x0C83)
    if not anus or not vis:
        return
    gsub = font['GSUB'].table
    lookups = gsub.LookupList.Lookup
    for lk in lookups:
        if lk.LookupType != 5:
            continue
        for st in lk.SubTable:
            if st.Format != 1 or anus not in st.Coverage.glyphs or vis in st.Coverage.glyphs:
                continue
            rs = st.SubRuleSet[st.Coverage.glyphs.index(anus)]
            # each rule: (0, mark-from-ಂ lookup), (1, anything→ಂ lookup)
            to_anus = {r.SubstLookupRecord[1].LookupListIndex for r in rs.SubRule}
            if len(to_anus) != 1:
                return
            src = lookups[to_anus.pop()]
            new = copy.deepcopy(src)
            for t in new.SubTable:
                t.mapping = {k: vis for k in t.mapping}
            lookups.append(new)
            gsub.LookupList.LookupCount = len(lookups)
            vi = len(lookups) - 1
            for r in rs.SubRule:   # the mark-from-ಂ lookups learn ಃ too
                for t in lookups[r.SubstLookupRecord[0].LookupListIndex].SubTable:
                    t.mapping[vis] = t.mapping[anus]
            nrs = copy.deepcopy(rs)
            for r in nrs.SubRule:
                r.SubstLookupRecord[1].LookupListIndex = vi
            pairs = sorted(zip(st.Coverage.glyphs + [vis], st.SubRuleSet + [nrs]), key=lambda x: font.getGlyphID(x[0]))
            st.Coverage.glyphs = [x[0] for x in pairs]; st.SubRuleSet = [x[1] for x in pairs]
            st.SubRuleSetCount = len(pairs)
            print(f'  svara marks move in front of ಃ ({len(nrs.SubRule)} rules)')
            return


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


# Interface fonts, bundled so the installed app looks the same offline (Latin + IAST only).
UI_LATIN = 'U+0020-007E,U+00A0-017F,U+0300-036F,U+1E00-1EFF,U+2000-206F,U+20B9,U+2190-2193,U+2212'
UI_SOURCES = [
    ('IBMPlexSans-Var.woff', 'ofl/ibmplexsans/IBMPlexSans[wdth,wght].ttf', {'wdth': 100, 'wght': (400, 600)}),
    ('GentiumBookPlus-Regular.woff', 'ofl/gentiumbookplus/GentiumBookPlus-Regular.ttf', None),
    ('GentiumBookPlus-Italic.woff', 'ofl/gentiumbookplus/GentiumBookPlus-Italic.ttf', None),
    ('GentiumBookPlus-Bold.woff', 'ofl/gentiumbookplus/GentiumBookPlus-Bold.ttf', None),
]


def build_ui(root, out):
    import io
    for dest, rel, axes in UI_SOURCES:
        font = TTFont(root / rel, lazy=False)
        if axes:
            buf = io.BytesIO()
            instantiateVariableFont(font, axes).save(buf)
            buf.seek(0)
            font = TTFont(buf, lazy=False)
        opts = subset.Options()
        opts.flavor = 'woff'
        opts.hinting = False
        opts.drop_tables += ['Silf', 'Glat', 'Gloc', 'Feat', 'Sill', 'DSIG']  # Graphite tables browsers ignore
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=subset.parse_unicodes(UI_LATIN))
        sub.subset(font)
        font.flavor = 'woff'
        font.save(out / dest)
        print(f'{out / dest}')


def otf_to_ttf(font):
    """CFF outlines → TrueType (quadratic), so the same glyph edits apply."""
    from fontTools.pens.cu2quPen import Cu2QuPen
    from fontTools.pens.ttGlyphPen import TTGlyphPen
    from fontTools.ttLib import newTable
    order = font.getGlyphOrder()
    gs = font.getGlyphSet()
    glyf = newTable('glyf'); glyf.glyphOrder = order; glyf.glyphs = {}
    for name in order:
        pen = TTGlyphPen(gs)
        gs[name].draw(Cu2QuPen(pen, 1.0, reverse_direction=True))
        glyf.glyphs[name] = pen.glyph()
    font['loca'] = newTable('loca')
    font['glyf'] = glyf
    del font['CFF ']
    if 'VORG' in font: del font['VORG']
    font['maxp'] = newTable('maxp'); font['maxp'].tableVersion = 0x00010000
    for k in ('maxZones', 'maxTwilightPoints', 'maxStorage', 'maxFunctionDefs', 'maxInstructionDefs',
              'maxStackElements', 'maxSizeOfInstructions', 'maxComponentElements', 'maxPoints', 'maxContours',
              'maxCompositePoints', 'maxCompositeContours', 'maxComponentDepth'):
        setattr(font['maxp'], k, 0)
    font['maxp'].maxZones = 1
    font['head'].glyphDataFormat = 0
    font['post'].formatType = 2.0
    font['post'].extraNames = []; font['post'].mapping = {}
    font.sfntVersion = '\x00\x01\x00\x00'
    for name in order:
        glyf[name].recalcBounds(glyf)
    return font


def make(font, script, unicodes, strong, level, deep=None):
    """One web font: subset, anudātta levelled, svara marks strengthened if `strong`."""
    import io
    buf = io.BytesIO(); font.save(buf); buf.seek(0); font = TTFont(buf)  # a fresh copy
    changed = []
    if strong:
        changed = [n for n in font.getGlyphOrder() if is_svara_glyph(n) and strengthen(font, n, 0, BAR_X[script])]
    if script == 'Kannada':
        visarga_swap(font)
    level_anudatta(font, level, ANU_GAP, deep, under_letter=script == 'Kannada')
    opts = subset.Options()
    opts.layout_features = ['*']
    opts.flavor = 'woff'
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=subset.parse_unicodes(unicodes))
    sub.subset(font)
    return font, changed


def build(root, out, adir=None, shobhika=None):
    out.mkdir(parents=True, exist_ok=True)
    build_ui(root, out)
    families = [(f'NotoSerif{script}', script, TTFont(root / rel), axes, unicodes)
                for script, rel, axes, unicodes in SOURCES]
    if shobhika:
        families.append(('Shobhika', 'Devanagari', TTFont(Path(shobhika) / 'Shobhika-Regular.otf'), None, SOURCES[0][3]))
    for name, script, font, axes, unicodes in families:
        if axes:
            font = instantiateVariableFont(font, axes)
        if 'CFF ' in font:
            font = otf_to_ttf(font)
        level = LEVEL[name]
        for tag, strong in (('Vedic', True), ('Std', False)):
            f, changed = make(font, script, unicodes, strong, level, DEEP.get(name))
            if adir and strong:
                audit_fonts(f, name, adir)
            dest = out / f'{name}-{tag}.woff'
            f.flavor = 'woff'
            f.save(dest)
            print(f'{dest}' + (f': strengthened {len(changed)} svara glyphs' if strong else ': stock marks'))


if __name__ == '__main__':
    args = sys.argv[1:]
    adir = None
    if '--audit' in args:
        i = args.index('--audit')
        adir = Path(args[i + 1])
        del args[i:i + 2]
    shob = None
    if '--shobhika' in args:
        i = args.index('--shobhika')
        shob = args[i + 1]
        del args[i:i + 2]
    build(Path(args[0]), Path(args[1]), adir, shob)
