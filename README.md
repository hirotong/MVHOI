# MVHOI Project Page

学术主页(Nerfies 风格,纯静态,无构建步骤)。

## 本地预览

```bash
cd webpage && python3 -m http.server 8934
# 打开 http://localhost:8934          正式主页
# 打开 http://localhost:8934/candidates.html   内部筛选页(不部署)
```

## 结构

```
index.html                  正式主页
candidates.html             内部候选筛选页(勾选 → 导出已选清单)
assets/
  css/style.css
  js/main.js                页面逻辑;CASES / DEMOS 配置数组在文件顶部
  videos/
    teaser.mp4              首屏 teaser(long1 ours,12.9s)
    comparisons/<case>/     short1-5, long1-2;每个 case 含
                            input/ours/genhoi/vace/hunyuancustom(/mimicmotion).mp4
    demos/                  More Results 画廊(more1_*/more2_*)
  images/refcols/           demo 目标物参考图(画廊角标)
  images/refpanels/         各 case 多视角参考拼图(暂未用到,可加)
candidates_assets/          候选低码率预览(151MB,不部署)
tools/generate_candidates.py  重新生成候选池的脚本
```

## 素材来源

- 精选对比 case: `data/pptx_videos/split/`(long2 已按 make_comparisons.sh 打人脸遮挡框)
- 候选池: 59 个 hoi0109 cross case
  (ours = `output/inference/Wan2.1-VACE-14B_full/0109_mvframe_low_agumentation_0117_800/cross`,
  GenHOI/HuMo/HunyuanCustom/MimicMotion 来自 `experiments/baseline/`)
- demo 候选: `demo_0117_800_final` + `test_demo_0120_3d2k_long`

## 改动指南

- 增删对比 case / demo:改 `assets/js/main.js` 顶部的 `CASES` / `DEMOS`,
  并把对应视频放进 `assets/videos/`。
- 部署 GitHub Pages 时排除 `candidates*` 与 `tools/`。
