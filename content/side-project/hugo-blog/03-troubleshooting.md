---
title: "Hugo 블로그 구축하면서 겪은 삽질 모음"
date: 2026-03-18T22:00:00+09:00
draft: false
tags: ["Hugo", "Decap CMS", "Netlify", "트러블슈팅"]
categories: ["Side Project"]
summary: "Hugo + GitHub Pages + Decap CMS 블로그를 구축하면서 만난 에러들과 해결 과정 정리"
---

## 1. 글이 배포 후 안 보이는 문제 — buildFuture

### 증상

로컬에서는 잘 보이는 글이 GitHub Pages 배포 후 404 발생.

### 원인

`hugo.toml`에 `buildFuture = false` (기본값) 설정 상태에서, GitHub Actions는 **UTC 기준**으로 빌드를 진행.

예를 들어 KST 기준 2026년 3월 18일 오전 3시에 작성한 글은, UTC로는 아직 3월 17일. Hugo가 "미래 날짜의 글"로 판단해서 빌드에서 제외.

### 해결

```toml
# hugo.toml
buildFuture = true
```

추가로 GitHub Actions에서 타임존도 설정:

```yaml
env:
  TZ: Asia/Seoul
```

---

## 2. decap-oauth.netlify.app 404 에러

### 증상

Decap CMS에서 "GitHub로 로그인" 클릭 시 `decap-oauth.netlify.app`으로 이동하면서 404 발생.

### 원인

Decap CMS 문서에서 안내하는 공용 OAuth 서버가 작동하지 않는 상태. 공용 서버는 관리 중단 또는 특정 사이트만 지원하는 경우가 있음.

### 해결

**직접 OAuth 프록시를 만들어서 해결.** Netlify Functions로 `/auth`와 `/callback` 엔드포인트를 구현하고, GitHub OAuth App의 Client ID/Secret을 환경변수로 등록.

자세한 설정 과정은 [Decap CMS 설정 글](/side-project/hugo-blog/02-decap-cms-setup/) 참고.

---

## 3. git-gateway 백엔드 실패

### 증상

Decap CMS에서 `git-gateway` 백엔드를 사용하면 "설정에 접근할 수 없습니다. git-gateway 백엔드 사용시 Identity service와 Git Gateway를 활성화 해야 합니다" 에러 발생.

### 시도한 것들

1. Netlify에서 Identity + Git Gateway 활성화 → 에러 지속
2. `config.yml`에 `identity_url`, `gateway_url` 명시 → 에러 지속
3. `site_url`을 Netlify 사이트로 지정 → 에러 지속

### 원인

`git-gateway` 백엔드는 **Netlify에서 호스팅하는 사이트에서만 작동**하는 구조.

Decap CMS가 로그인할 때 **현재 도메인**에서 `/.netlify/identity` 엔드포인트를 찾음. GitHub Pages(`iamhxxn2.github.io`)에는 이 엔드포인트가 존재하지 않으므로 항상 실패.

```
❌ iamhxxn2.github.io/.netlify/identity → 없음 (GitHub Pages)
✅ xxx.netlify.app/.netlify/identity    → 여기에 있음 (Netlify)
```

`identity_url` 등으로 외부 URL을 지정해도, Decap CMS 내부적으로 현재 도메인을 기준으로 검증하는 로직이 있어서 우회가 안 됨.

### 해결

`git-gateway` 대신 `github` 백엔드 + OAuth 프록시 방식으로 전환.

```yaml
# git-gateway (GitHub Pages에서 작동 안 함)
backend:
  name: git-gateway

# github 백엔드 (GitHub Pages에서 작동)
backend:
  name: github
  repo: iamhxxn2/iamhxxn2.github.io
  branch: main
  base_url: https://xxx.netlify.app
```

### 교훈

| 백엔드 | 호스팅 | 사용 가능 여부 |
|--------|--------|----------------|
| `git-gateway` | Netlify | 가능 |
| `git-gateway` | GitHub Pages | **불가능** |
| `github` + OAuth 프록시 | Netlify | 가능 |
| `github` + OAuth 프록시 | GitHub Pages | **가능** |

GitHub Pages에서 Decap CMS를 사용하려면 **반드시 `github` 백엔드 + 별도 OAuth 프록시** 구성 필요.

---

## 4. Netlify 빌드 실패 — hugo: command not found

### 증상

Netlify에 레포를 연결하고 배포했더니 `bash: line 1: hugo: command not found` 에러 발생.

### 원인

Netlify Build 환경에 Hugo가 설치되어 있지 않은 상태에서, Build command가 `hugo`로 설정되어 있었음.

### 해결

Netlify에서 Hugo 빌드를 할 필요가 없음. 블로그 빌드는 GitHub Actions가 담당하고, Netlify는 OAuth 함수만 호스팅하면 됨.

Build command를 `echo 'skip'`으로 변경하고, Publish directory를 `static`으로 설정해서 해결.

```toml
# netlify.toml
[build]
  command = "echo 'skip'"
  publish = "static"
```

---

## 5. OAuth에서 client_id=undefined

### 증상

GitHub 로그인 클릭 시 `github.com/login/oauth/authorize?client_id=undefined&scope=repo`로 이동하면서 404 발생.

### 원인

Netlify에 환경변수(`OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`)를 추가한 후 **재배포를 하지 않아서** 함수가 환경변수를 읽지 못함.

### 해결

환경변수 추가 후 **Deploys → Trigger deploy → Deploy site**로 재배포 진행. Netlify Functions는 배포 시점의 환경변수를 사용하므로, 환경변수 변경 후에는 반드시 재배포 필요.

---

## 최종 정리

| 구성 요소 | 역할 | 비용 |
|-----------|------|------|
| Hugo + PaperMod | 마크다운 → HTML 변환 | 무료 |
| GitHub Pages | 블로그 호스팅 | 무료 |
| GitHub Actions | 자동 빌드/배포 | 무료 |
| Decap CMS | 웹 기반 글 작성 | 무료 |
| Netlify Functions | OAuth 인증 프록시 | 무료 |
| GitHub OAuth App | GitHub 로그인 | 무료 |

**전체 운영 비용: 무료**

삽질이 꽤 많았지만, 한 번 구축하면 이후에는 웹 브라우저에서 글 작성 → 자동 배포까지 원클릭으로 가능.
