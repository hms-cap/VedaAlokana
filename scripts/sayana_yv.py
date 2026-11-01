#!/usr/bin/env python3
"""
sayana_yv.py — add Sāyaṇa's Yajurveda bhāṣya (machine-read text from archive.org)
to Vedāvalokanam: Taittirīya Saṃhitā (ts), Brāhmaṇa (tb) and Āraṇyaka (ta).

Only the Python standard library is needed. Run it from the repo root:

  python scripts/sayana_yv.py downloads/              # check and write
  python scripts/sayana_yv.py downloads/ --dry-run    # check only, write nothing

`downloads/` is the folder fetch_ia.py filled: it is searched for *_djvu.txt files.
Which text a file belongs to comes from its name (…samhita… → ts, …brahman… → tb,
…aranyak… → ta); files with "bhaskara", "kanva" or nothing recognisable are skipped.
Use --text ts|tb|ta to force one text for every file given.

How it works
  1. Clean the text: drop running heads, footnotes (variant readings), page numbers,
     rules; rejoin words broken across lines.
  2. Split into anuvākas at Sāyaṇa's closing colophon
     ("… माधवीये वेदार्थप्रकाशे … ऽनुवाकः ॥ N ॥"), allowing for OCR damage.
  3. Match anuvākas to the app's own units (pañcāśats / sections) by comparing
     consonant skeletons, so svara marks, sandhi spellings and most OCR errors do
     not matter. The match keeps both in order; units a file does not cover are
     left alone, so each volume can be run on its own and files can be added later.
  4. Each anuvāka's bhāṣya is attached to the first unit it covers, in the same
     files the Ṛgveda bhāṣya uses: web/data/{ts,tb,ta}/s{d1}-{n}.json, and the
     text is marked in catalog.json so the reader shows the bhāṣya toggle.

It also writes sayana_yv_out/:
  report.csv            one row per anuvāka: where it went and how well it matched
  anuvaka/<text>/*.txt  the cleaned text of every anuvāka, for proofreading
Rows with a low score (under ~0.35) are the ones to look at first.
"""
import argparse, csv, json, os, re, sys, unicodedata
from collections import defaultdict

CHUNK = 20                         # sūktas/prapāṭhakas per file, as for the Ṛgveda
LABEL = 'Sāyaṇa (OCR)'            # shown in the reader's toggle
MIN_SIM = 0.30                     # a unit must share this much with an anuvāka to count as inside it
NULL_SCORE = 0.0                   # gain for a unit this file does not cover

DEV_DIGITS = str.maketrans('०१२३४५६७८९', '0123456789')

# ---------------------------------------------------------------- cleaning

HEAD_RE = re.compile(r'(भाष्यसमेत|यजुर्वेदीय|यजुरवेदीय|यजुवेदीय|यजुर्ेदीय|संहिताभाष्य|तैत्तिरीय\S*(?:संहिता|ब्राह्मण|आरण्यक)म्)')
FOOT_RE = re.compile(r'^\s*[०-९0-9]{1,2}\s*[कखगघङचछजझटठडढ]\s*[.,।]')
REF_RE = re.compile(r'[\[\{(]\s*(?:प्रपा|का[ण०]|प्र[०.])[^\]\})]{0,25}[\]\})]')


def clean_lines(text):
    out = []
    for line in text.splitlines():
        s = line.strip()
        if not s:
            out.append('')
            continue
        dev = sum('ऀ' <= c <= 'ॿ' for c in s)
        if dev < max(4, len(s) * 0.35):          # page numbers, rules, Latin noise
            continue
        if FOOT_RE.match(s):                     # "१ क. ...  २ ख. ..." variant readings
            continue
        if len(s) < 90 and HEAD_RE.search(s):    # running heads
            continue
        s = REF_RE.sub(' ', s)
        out.append(s)
    text = '\n'.join(out)
    text = re.sub(r'[-–]\s*\n\s*', '', text)    # words broken over lines
    text = re.sub(r'\s*\n\s*', ' ', text)
    text = re.sub(r'[~_=*#|^<>\\]+', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()


# ---------------------------------------------------------------- splitting

# Sāyaṇa's closing colophon for an anuvāka. The mūla's own colophon (without
# माधवीये / वेदार्थप्रकाश) also ends in अनुवाकः ॥ N ॥, so we require those words.
COLOPHON = re.compile(
    r'(?:माधवीये|माधवी[यप]|वेदा\S{0,3}प्रका|वेदार्थ)[^॥]{0,220}?'
    r'[ऽ]?[नम]ु[वब]ाकः?\s*[॥।|1!]+\s*([०-९0-9]{1,3})?\s*[॥।|1!]*')
BARE = re.compile(r'[ऽ]?[नम]ु[वब]ाकः?\s*[॥।|1!]+\s*([०-९0-9]{1,3})\s*[॥।|1!]+')


def split_anuvakas(text, loose=False):
    pat = BARE if loose else COLOPHON
    parts, last, nums = [], 0, []
    for m in pat.finditer(text):
        body = text[last:m.start()].strip()
        if len(body) > 200:                      # ignore repeats a few words apart
            parts.append(body)
            n = m.group(1)
            nums.append(int(n.translate(DEV_DIGITS)) if n else None)
        last = m.end()
    return parts, nums, text[last:].strip()


# ---------------------------------------------------------------- matching

CONS = set(chr(c) for c in range(0x0915, 0x093a))     # क … ह


def skeleton(s):
    s = unicodedata.normalize('NFC', s)
    s = s.replace('ख्ष', 'क्ष').replace('ळ्ह', 'ढ').replace('ळ', 'ड')
    s = re.sub(r'[ङञणनम]्|[ंँꣳ]', '', s)      # nasals written either way
    out = []
    for c in s:
        if c in CONS and (not out or out[-1] != c):  # स्स्थ / सः स्थ, doubled letters
            out.append(c)
    return ''.join(out)


def grams(sk, n=5):
    return [sk[i:i + n] for i in range(len(sk) - n + 1)]


def similarity(unit_grams, chunk_set):
    if not unit_grams:
        return 0.0
    return sum(g in chunk_set for g in unit_grams) / len(unit_grams)


def align(units, chunks):
    """Monotone assignment of units to chunks, with 'before'/'after' states for
    units this file does not cover. Returns per-unit chunk index or None, and
    the similarity matrix."""
    ug = [grams(skeleton(u['text']))[:120] for u in units]
    cs = [set(grams(skeleton(c))) for c in chunks]
    m, n = len(chunks), len(units)
    S = [[similarity(ug[j], cs[i]) for j in range(n)] for i in range(m)]
    NEG = -1e18
    # states: 0 = before, 1..m = chunk, m+1 = after
    k = m + 2
    f = [[NEG] * k for _ in range(n + 1)]
    back = [[0] * k for _ in range(n + 1)]
    f[0][0] = 0.0
    for j in range(1, n + 1):
        best, arg = NEG, 0
        for s in range(k):
            if f[j - 1][s] > best:
                best, arg = f[j - 1][s], s
            # best over states ≤ s in the previous column: monotone moves
            score = NULL_SCORE if s in (0, m + 1) else S[s - 1][j - 1] - MIN_SIM
            stay = f[j - 1][s]
            prev = best if s > 0 else f[j - 1][0]
            if s > 0 and stay >= best:
                f[j][s], back[j][s] = stay + score, s
            else:
                f[j][s], back[j][s] = prev + score, (arg if s > 0 else 0)
    s = max(range(k), key=lambda t: f[n][t])
    assign = [None] * n
    for j in range(n, 0, -1):
        assign[j - 1] = None if s in (0, m + 1) else s - 1
        s = back[j][s]
    return assign, S


# ---------------------------------------------------------------- app data

def load_units(data, tid):
    units = []
    files = sorted((f for f in os.listdir(os.path.join(data, tid))
                    if re.fullmatch(r't\d+\.json', f)), key=lambda f: int(f[1:-5]))
    for f in files:
        d1 = int(f[1:-5])
        doc = json.load(open(os.path.join(data, tid, f), encoding='utf-8'))
        for d2 in sorted(doc, key=int):
            for row in doc[d2]:
                units.append({'d1': d1, 'd2': int(d2), 'v': row[0], 'text': ' '.join(row[1])})
    return units


def text_of(path):
    name = os.path.basename(path).lower()
    if any(w in name for w in ('bhaskara', 'kanva', 'kaanva')):
        return None
    if 'samhit' in name or 'sanhit' in name:
        return 'ts'
    if 'brahman' in name:
        return 'tb'
    if 'aranyak' in name:
        return 'ta'
    return None


# ---------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('inputs', nargs='+', help='folders or *_djvu.txt files')
    ap.add_argument('--data', default='web/data', help='the app data folder (default web/data)')
    ap.add_argument('--text', choices=['ts', 'tb', 'ta'], help='treat every input as this text')
    ap.add_argument('--loose', action='store_true',
                    help='split at any "अनुवाकः ॥ N ॥", for editions without Sāyaṇa colophons')
    ap.add_argument('--out', default='sayana_yv_out')
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()

    if not os.path.exists(os.path.join(a.data, 'catalog.json')):
        sys.exit(f'{a.data}/catalog.json not found — run from the repo root or pass --data')

    files = []
    for p in a.inputs:
        if os.path.isdir(p):
            for root, _, names in os.walk(p):
                files += [os.path.join(root, f) for f in names if f.endswith('_djvu.txt')]
        else:
            files.append(p)
    by_text = defaultdict(list)
    for f in sorted(files):
        t = a.text or text_of(f)
        if t:
            by_text[t].append(f)
        else:
            print(f'   skip  {f}')
    if not by_text:
        sys.exit('no Taittirīya Sāyaṇa files found')

    os.makedirs(a.out, exist_ok=True)
    rows, placed = [], {}
    for tid, paths in by_text.items():
        units = load_units(a.data, tid)
        claim = {}                                   # unit index -> (score, text, label)
        tdir = os.path.join(a.out, 'anuvaka', tid)
        os.makedirs(tdir, exist_ok=True)
        for path in paths:
            raw = open(path, encoding='utf-8', errors='replace').read()
            text = clean_lines(raw)
            chunks, nums, tail = split_anuvakas(text, a.loose)
            base = os.path.basename(path)[:-9]
            if len(chunks) < 3 and not a.loose:
                print(f'!! {base}: only {len(chunks)} colophons found; '
                      f'try --loose, or send me this file')
            if not chunks:
                continue
            assign, S = align(units, chunks)
            got = defaultdict(list)
            for j, i in enumerate(assign):
                if i is not None:
                    got[i].append(j)
            print(f'{tid}  {base}: {len(chunks)} anuvākas, {sum(1 for i in got)} placed, '
                  f'{len(text):,} chars')
            for i, body in enumerate(chunks):
                js = got.get(i, [])
                score = sum(S[i][j] for j in js) / len(js) if js else 0.0
                first = units[js[0]] if js else None
                where = f"{first['d1']}.{first['d2']}.{first['v']}" if first else ''
                last = units[js[-1]] if js else None
                upto = f"{last['d1']}.{last['d2']}.{last['v']}" if last else ''
                label = f'{base}#{i + 1:03d}' + (f' (anuvāka {nums[i]})' if nums[i] else '')
                rows.append([tid, base, i + 1, nums[i] or '', where, upto, len(js),
                             f'{score:.2f}', len(body)])
                with open(os.path.join(tdir, f'{base}_{i + 1:03d}.txt'), 'w', encoding='utf-8') as fo:
                    fo.write(f'# {tid} {where}–{upto}  score {score:.2f}\n{body}\n')
                if js:
                    j0 = js[0]
                    if j0 not in claim or claim[j0][0] < score:
                        claim[j0] = (score, body, label)
        placed[tid] = (units, claim)

    with open(os.path.join(a.out, 'report.csv'), 'w', newline='', encoding='utf-8') as fo:
        w = csv.writer(fo)
        w.writerow(['text', 'file', 'chunk', 'anuvaka_no', 'from_unit', 'to_unit', 'units', 'score', 'chars'])
        w.writerows(rows)
    low = sum(1 for r in rows if float(r[7]) < 0.35)
    print(f'report: {a.out}/report.csv  ({len(rows)} anuvākas, {low} with score < 0.35)')

    if a.dry_run:
        print('dry run: nothing written to the app')
        return

    cat_path = os.path.join(a.data, 'catalog.json')
    cat = json.load(open(cat_path, encoding='utf-8'))
    for tid, (units, claim) in placed.items():
        if not claim:
            continue
        files = defaultdict(dict)
        for j, (score, body, _) in claim.items():
            u = units[j]
            key = f"s{u['d1']}-{(u['d2'] - 1) // CHUNK}.json"
            files[key].setdefault(str(u['d2']), {})[str(u['v'])] = body
        for key, content in files.items():
            p = os.path.join(a.data, tid, key)
            old = json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {}
            for d2, vs in content.items():
                old.setdefault(d2, {}).update(vs)
            with open(p, 'w', encoding='utf-8') as fo:
                json.dump(old, fo, ensure_ascii=False, separators=(',', ':'))
        for t in cat['texts']:
            if t['id'] == tid:
                t['has']['bhashya'] = LABEL
                if 'archive.org' not in t['sources']:
                    t['sources'].append('archive.org')
        print(f'{tid}: bhāṣya written for {len(claim)} units in {len(files)} files')
    with open(cat_path, 'w', encoding='utf-8') as fo:
        json.dump(cat, fo, ensure_ascii=False, indent=1)
    print('catalog.json updated — reload the app and use the Bhāṣya toggle')


if __name__ == '__main__':
    main()
