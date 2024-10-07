import { handleStravaAuthorisation } from "@/auth/strava";

export async function GET(request: Request) {
  const { url } = request;
  console.log(`GET: /authorise request with url: "${url}"`);

  const urlParams = new URL(url).searchParams;

  const platformType = urlParams.get("platform_type");

  switch (platformType) {
    case "strava":
      return handleStravaAuthorisation(urlParams);
    default:
      console.error("Unknown platform type: ", platformType);
      return new Response("Error, unknown platform type");
  }
}
