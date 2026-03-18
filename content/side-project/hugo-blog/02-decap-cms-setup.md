---
title: "Decap CMS + Netlify OAuth로 웹에서 블로그 글 작성하기"
date: 2026-03-18T21:00:00+09:00
draft: false
tags: ["Decap CMS", "Netlify", "OAuth", "GitHub"]
categories: ["Side Project"]
summary: "GitHub Pages 블로그에 Decap CMS를 연동하고, Netlify Functions로 OAuth 프록시를 만들어 웹에서 글을 작성/발행하는 과정 정리"
---

## 문제 인식

Hugo + GitHub Pages 블로그의 글 작성 과정:

```
1. 로컬에서 마크다운 파일 생성
2. Front Matter 작성
3. 본문 작성
4. git add → git commit → git push
```

매번 터미널에서 git 명령어를 치는 건 번거로움. 특히 외출 중이거나 다른 PC에서 글을 쓰고 싶을 때 제약이 큼.

**웹 브라우저에서 바로 글을 쓰고 발행할 수 있으면?** → Decap CMS 도입.

---

## Decap CMS란?

구 Netlify CMS에서 이름이 바뀐 **오픈소스 Git 기반 콘텐츠 관리 시스템**.

블로그에 `/admin/` 페이지를 추가하면 웹 에디터가 나타나고, 글을 작성하면 **GitHub 레포에 자동으로 커밋**하는 구조.

핵심 특징:
- **별도 서버/DB 불필요** — Git 레포 자체가 데이터베이스 역할
- **마크다운 에디터 내장** — 리치 텍스트 편집 가능
- **이미지 업로드 지원** — 드래그앤드롭으로 이미지 첨부
- **커스텀 필드 정의** — 태그, 카테고리, 날짜 등 자유롭게 설정

---

## Netlify의 역할

여기서 혼동하기 쉬운 부분 정리.

| | 역할 |
|---|---|
| **GitHub Pages** | 블로그 호스팅 (HTML 서비스) |
| **Netlify** | OAuth 인증 프록시 서버 (로그인 처리만 담당) |
| **Decap CMS** | 웹 에디터 (브라우저에서 실행) |

Netlify에서 블로그를 호스팅하는 게 아님. **GitHub 로그인 인증을 처리하는 중간 서버** 역할만 수행.

왜 필요한가? Decap CMS가 GitHub API에 접근하려면 OAuth 인증이 필요한데, 이 과정에서 Client Secret을 사용해야 함. Client Secret은 브라우저(클라이언트)에 노출하면 안 되므로, **서버 사이드에서 처리**해야 함. GitHub Pages는 정적 호스팅이라 서버 코드를 실행할 수 없기 때문에, Netlify Functions를 활용.

---

## 전체 인증 흐름

```
사용자 → /admin/ 접속 → "GitHub로 로그인" 클릭
                              ↓
        Netlify Functions /auth (Client ID로 GitHub 인증 페이지 리다이렉트)
                              ↓
        GitHub 로그인 화면에서 "Authorize" 클릭
                              ↓
        Netlify Functions /callback (code → access_token 교환)
                              ↓
        토큰을 Decap CMS에 전달 → 로그인 완료
                              ↓
        Decap CMS가 GitHub API로 글 작성/수정/삭제
```

---

## 설정 과정

### 1. GitHub OAuth App 생성

[github.com/settings/developers](https://github.com/settings/developers) → **OAuth Apps** → **New OAuth App**

| 항목 | 값 |
|------|-----|
| Application name | Blog CMS |
| Homepage URL | https://iamhxxn2.github.io |
| Authorization callback URL | https://<netlify-site>.netlify.app/callback |

등록 후 **Client ID**와 **Client Secret** 복사.

### 2. Netlify 사이트 생성

[app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project** → GitHub 레포 연결

Build settings:
- Build command: `echo 'skip'` (빌드 불필요)
- Publish directory: `static`

Netlify는 블로그 빌드를 하지 않음. OAuth 함수를 호스팅하는 용도.

### 3. OAuth 프록시 함수 작성

#### `netlify.toml`

```toml
[build]
  command = "echo 'skip'"
  publish = "static"

[functions]
  directory = "netlify/functions"
```

#### `netlify/functions/auth.mjs`

GitHub 인증 페이지로 리다이렉트하는 함수:

```javascript
export default async (req) => {
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") || "repo,user";
  const clientId = process.env.OAUTH_CLIENT_ID;

  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=${scope}`;

  return new Response(null, {
    status: 302,
    headers: { Location: authUrl },
  });
};

export const config = { path: "/auth" };
```

#### `netlify/functions/callback.mjs`

GitHub에서 받은 code를 access_token으로 교환하고, Decap CMS에 전달하는 함수:

```javascript
export default async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });

  const data = await response.json();

  if (data.error) {
    return new Response(renderMessage("error", JSON.stringify(data)), {
      headers: { "Content-Type": "text/html" },
    });
  }

  return new Response(
    renderMessage("success", JSON.stringify({
      token: data.access_token, provider: "github"
    })),
    { headers: { "Content-Type": "text/html" } }
  );
};

function renderMessage(status, content) {
  return `<!DOCTYPE html><html><body><script>
(function() {
  function receiveMessage(e) {
    window.opener.postMessage(
      'authorization:github:${status}:${JSON.stringify(content).slice(1, -1)}',
      e.origin
    );
    window.removeEventListener("message", receiveMessage, false);
  }
  window.addEventListener("message", receiveMessage, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script></body></html>`;
}

export const config = { path: "/callback" };
```

`postMessage`로 부모 창(Decap CMS)에 토큰을 전달하는 구조. 이게 Decap CMS의 OAuth 프로토콜.

### 4. Netlify 환경변수 설정

Netlify 대시보드 → **Project configuration** → **Environment variables**:

- `OAUTH_CLIENT_ID`: GitHub OAuth App의 Client ID
- `OAUTH_CLIENT_SECRET`: GitHub OAuth App의 Client Secret

환경변수 추가 후 **반드시 재배포** 필요. 재배포하지 않으면 함수에서 `undefined`로 읽힘.

### 5. Decap CMS 파일 추가

#### `static/admin/index.html`

```html
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blog Admin</title>
</head>
<body>
  <script src="https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.js"></script>
</body>
</html>
```

Decap CMS JS를 로드하면 자동으로 관리자 UI 생성.

#### `static/admin/config.yml`

```yaml
backend:
  name: github
  repo: iamhxxn2/iamhxxn2.github.io
  branch: main
  base_url: https://dynamic-marzipan-de0ac3.netlify.app

media_folder: static/images/uploads
public_folder: /images/uploads
locale: ko

collections:
  - name: "tech-llm"
    label: "Tech > LLM"
    folder: "content/tech/llm"
    create: true
    slug: "{{slug}}"
    fields:
      - { label: "Title", name: "title", widget: "string" }
      - { label: "Date", name: "date", widget: "datetime" }
      - { label: "Draft", name: "draft", widget: "boolean", default: false }
      - { label: "Tags", name: "tags", widget: "list", allow_add: true }
      - { label: "Categories", name: "categories", widget: "list" }
      - { label: "Body", name: "body", widget: "markdown" }
```

핵심 설정 설명:
- `name: github` — GitHub 백엔드 사용 (git-gateway 아님)
- `base_url` — OAuth 프록시 서버 주소 (Netlify 사이트)
- `collections` — CMS에서 관리할 콘텐츠 폴더와 입력 필드 정의
- `media_folder` — 이미지 업로드 경로

---

## 완성된 흐름

```
/admin/ 접속 → GitHub 로그인 → 글 작성 → 발행
                                          ↓
                              GitHub 레포에 자동 커밋
                                          ↓
                              GitHub Actions → Hugo 빌드
                                          ↓
                              GitHub Pages에 배포 완료
```

코드 한 줄 안 치고 웹에서 글 작성 → 자동 배포까지 완료.
