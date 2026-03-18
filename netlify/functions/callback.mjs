export default async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;

  try {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
      }),
    });

    const data = await response.json();

    if (data.error) {
      return new Response(renderMessage("error", JSON.stringify(data)), {
        headers: { "Content-Type": "text/html" },
      });
    }

    return new Response(
      renderMessage("success", JSON.stringify({ token: data.access_token, provider: "github" })),
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (err) {
    return new Response(renderMessage("error", err.message), {
      headers: { "Content-Type": "text/html" },
    });
  }
};

function renderMessage(status, content) {
  return `<!DOCTYPE html>
<html>
<body>
<script>
(function() {
  function receiveMessage(e) {
    console.log("receiveMessage", e);
    window.opener.postMessage(
      'authorization:github:${status}:${JSON.stringify(content).slice(1, -1)}',
      e.origin
    );
    window.removeEventListener("message", receiveMessage, false);
  }
  window.addEventListener("message", receiveMessage, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script>
</body>
</html>`;
}

export const config = {
  path: "/callback",
};
