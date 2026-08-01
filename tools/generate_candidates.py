#!/usr/bin/env python3
"""Transcode all candidate videos to low-res proxies for candidates.html.

Outputs webpage/candidates_assets/videos/*.mp4 plus manifest.js.
Not part of the deployed site.
"""
import json
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path('/Volumes/Hiro/MVHOI')
OUT = ROOT / 'webpage' / 'candidates_assets'
VID = OUT / 'videos'
VID.mkdir(parents=True, exist_ok=True)

OURS = ROOT / 'output/inference/Wan2.1-VACE-14B_full/0109_mvframe_low_agumentation_0117_800/cross'
GENHOI = ROOT / 'experiments/baseline/GenHOI/results_for_evaluate/hoi_0109_cross_selected'
HUMO = ROOT / 'experiments/baseline/humo/hoi0109_cross_humo/gen'
HUNYUAN = ROOT / 'experiments/baseline/hunyuancustom/hoi0109_cross_hunyuancustom/gen'
MIMIC = ROOT / 'experiments/baseline/mimicmotion/hoi0109_cross_mimicmotion/gen'

DEMO_POOLS = [
    ('f0', ROOT / 'output/inference/Wan2.1-VACE-14B_full/demo_0117_800_final/chunk0'),
    ('f2k', ROOT / 'output/inference/Wan2.1-VACE-14B_full/demo_0117_800_final/chunk0_2048'),
    ('ld0', ROOT / 'output/inference/Wan2.1-VACE-14B_full/test_demo_0120_3d2k_long/chunk0_42'),
    ('ld1', ROOT / 'output/inference/Wan2.1-VACE-14B_full/test_demo_0120_3d2k_long/chunk1_42'),
]

jobs = []  # (src, dst)


def add(src: Path, dst_name: str):
    if src.exists():
        jobs.append((src, VID / dst_name))
        return True
    return False


# ── comparison cases ──────────────────────────────────────────────
cases = sorted(p.name.removesuffix('_generated.mp4')
               for p in OURS.glob('*_generated.mp4'))
manifest_cases = []
for i, case in enumerate(cases, 1):
    cid = f'c{i:02d}'
    methods = {}
    for method, src in [
        ('gt', GENHOI / f'{case}_gt.mp4'),
        ('ours', OURS / f'{case}_generated.mp4'),
        ('genhoi', GENHOI / f'{case}_generated.mp4'),
        ('humo', HUMO / f'{case}_generated.mp4'),
        ('hunyuancustom', HUNYUAN / f'{case}_generated.mp4'),
        ('mimicmotion', MIMIC / f'{case}_generated.mp4'),
    ]:
        if add(src, f'{cid}_{method}.mp4'):
            methods[method] = f'{cid}_{method}.mp4'
    manifest_cases.append({'id': cid, 'name': case, 'methods': methods})

# ── demo candidates ───────────────────────────────────────────────
manifest_demos = []
for tag, pool in DEMO_POOLS:
    if not pool.exists():
        continue
    for j, src in enumerate(sorted(pool.glob('*_generated.mp4')), 1):
        did = f'{tag}_{j:03d}'
        add(src, f'demo_{did}.mp4')
        manifest_demos.append({'id': did, 'name': src.name.removesuffix('_generated.mp4'),
                               'file': f'demo_{did}.mp4', 'pool': tag})


def encode(job):
    src, dst = job
    if dst.exists():
        return True
    cmd = ['ffmpeg', '-y', '-v', 'error', '-i', str(src),
           '-vf', 'scale=-2:540', '-c:v', 'libx264', '-crf', '30',
           '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-an',
           '-movflags', '+faststart', str(dst)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f'FAIL {src}: {r.stderr.strip()[:200]}', flush=True)
        return False
    return True


print(f'{len(jobs)} encode jobs', flush=True)
with ThreadPoolExecutor(max_workers=4) as pool:
    results = list(pool.map(encode, jobs))
print(f'done: {sum(results)}/{len(results)} ok', flush=True)

manifest = {'cases': manifest_cases, 'demos': manifest_demos}
(OUT / 'manifest.js').write_text(
    'window.CANDIDATES = ' + json.dumps(manifest, ensure_ascii=False, indent=1) + ';\n',
    encoding='utf-8')
print('manifest written', flush=True)
sys.exit(0 if all(results) else 1)
