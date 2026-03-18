---
title: "Hugo + GitHub Pages로 블로그 만들기"
date: 2026-03-18T20:00:00+09:00
draft: false
tags: ["Hugo", "GitHub Pages", "PaperMod", "블로그"]
categories: ["Side Project"]
summary: "Hugo 정적 사이트 생성기와 PaperMod 테마로 블로그를 만들고, GitHub Pages + GitHub Actions로 자동 배포하는 과정 정리"
---

## Hugo란?

Go 언어 기반의 **정적 사이트 생성기(Static Site Generator)**로, 마크다운 파일을 HTML로 변환해서 블로그를 생성하는 도구.

정적 사이트 생성기를 사용하는 이유는 간단함. WordPress 같은 동적 CMS는 서버, 데이터베이스, PHP 등이 필요하지만, 정적 사이트는 **HTML 파일만 있으면 끝**. 서버 비용도 없고 속도도 빠름.

Hugo를 선택한 이유:
- **빌드 속도가 압도적으로 빠름** — 수천 개 글도 수 초 내 빌드
- **테마가 다양함** — PaperMod, Stack 등 깔끔한 테마 많음
- **GitHub Pages와 궁합이 좋음** — 무료 호스팅 + 자동 배포 가능

---

## GitHub Pages란?

GitHub 레포지토리의 내용을 **무료로 웹사이트로 호스팅**해주는 서비스. `username.github.io` 형태의 도메인 제공.

별도의 서버 없이 GitHub에 코드를 push하면 자동으로 사이트가 배포되는 구조.

---

## 프로젝트 생성

### Hugo 설치 및 초기화

```bash
# Hugo 설치 (macOS)
brew install hugo

# 새 프로젝트 생성
hugo new site blog
cd blog
git init
```

### PaperMod 테마 적용

```bash
git submodule add https://github.com/adityatelange/hugo-PaperMod.git themes/PaperMod
```

PaperMod는 깔끔하고 가독성이 좋은 Hugo 테마. 다크모드, 검색, 아카이브 등 기본 기능이 잘 갖춰져 있음.

### hugo.toml 기본 설정

```toml
baseURL = "https://iamhxxn2.github.io/"
languageCode = "ko"
title = "Hoon's Blog"
theme = "PaperMod"
buildFuture = true
```

`buildFuture = true` 설정이 중요한데, 이 부분은 [삽질 기록](/side-project/hugo-blog/03-troubleshooting/)에서 자세히 설명.

---

## 콘텐츠 구조

Hugo는 `content/` 폴더 아래 마크다운 파일을 두면 자동으로 페이지를 생성. 폴더 구조가 곧 URL 구조가 됨.

```
content/
├── tech/
│   ├── _index.md
│   ├── llm/
│   │   ├── _index.md
│   │   └── llm-agent-pipeline.md  → /tech/llm/llm-agent-pipeline/
│   └── python/
│       └── _index.md
├── lifestyle/
│   └── routine/
│       └── morning-routine.md     → /lifestyle/routine/morning-routine/
├── economy/
│   └── market/
│       └── ai-market-trend.md     → /economy/market/ai-market-trend/
└── side-project/
    └── hugo-blog/
        └── 이 글!
```

각 폴더의 `_index.md`는 해당 섹션의 목록 페이지 역할. `title`만 지정하면 됨.

### 글 작성 형식

마크다운 파일 상단에 **Front Matter**로 메타데이터 작성:

```markdown
---
title: "글 제목"
date: 2026-03-18T20:00:00+09:00
draft: false
tags: ["태그1", "태그2"]
categories: ["카테고리"]
summary: "글 요약"
---

여기에 본문 작성
```

---

## GitHub Actions로 자동 배포

GitHub에 push하면 자동으로 Hugo 빌드 → GitHub Pages 배포가 이루어지도록 설정.

### `.github/workflows/deploy.yml`

```yaml
name: Deploy Hugo to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    env:
      HUGO_VERSION: "0.157.0"
    steps:
      - name: Install Hugo
        run: |
          wget -O ${{ runner.temp }}/hugo.deb https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_linux-amd64.deb
          sudo dpkg -i ${{ runner.temp }}/hugo.deb

      - name: Checkout
        uses: actions/checkout@v4
        with:
          submodules: recursive
          fetch-depth: 0

      - name: Setup Pages
        id: pages
        uses: actions/configure-pages@v5

      - name: Build with Hugo
        env:
          TZ: Asia/Seoul
        run: hugo --gc --minify --baseURL "${{ steps.pages.outputs.base_url }}/"

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./public

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### GitHub 레포 설정

레포 **Settings** → **Pages** → Source를 **GitHub Actions**로 변경 필수. 이 설정이 없으면 배포가 작동하지 않음.

---

## 배포 흐름 정리

```
마크다운 글 작성/수정
        ↓
  git push origin main
        ↓
  GitHub Actions 트리거
        ↓
  Hugo 빌드 (마크다운 → HTML)
        ↓
  GitHub Pages에 배포
        ↓
  https://iamhxxn2.github.io 에 반영 완료
```

여기까지가 Hugo + GitHub Pages 기본 블로그 구축. 다음 글에서는 웹 브라우저에서 직접 글을 작성할 수 있도록 **Decap CMS**를 연동하는 과정 정리.
