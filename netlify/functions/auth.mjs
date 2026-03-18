export default async (req) => {
  const url = new URL(req.url);
  const provider = url.searchParams.get("provider") || "github";
  const scope = url.searchParams.get("scope") || "repo,user";
  const clientId = process.env.OAUTH_CLIENT_ID;

  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=${scope}`;

  return new Response(null, {
    status: 302,
    headers: { Location: authUrl },
  });
};

export const config = {
  path: "/auth",
};
