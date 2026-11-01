import { NextRequest, NextResponse } from "next/server";

export const revalidate = 300;

export async function GET(request: NextRequest) {
  const apiKey = process.env.CRICKET_API_KEY;
  const matchId = request.nextUrl.searchParams.get("id");

  if (!apiKey || !matchId) {
    return NextResponse.json(
      {
        status: "failure",
        reason: "API key or match ID missing."
      },
      { status: 400 }
    );
  }

  try {
    const url = new URL("https://api.cricapi.com/v1/match_scorecard");

    url.searchParams.set("apikey", apiKey);
    url.searchParams.set("offset", "0");
    url.searchParams.set("id", matchId);

    const response = await fetch(url.toString(), {
      next: { revalidate: 300 },
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          status: "failure",
          reason: `Cricket provider returned HTTP ${response.status}.`
        },
        { status: 502 }
      );
    }

    const payload = await response.json();

    if (payload.status === "failure") {
      return NextResponse.json(
        {
          status: "failure",
          reason: payload.reason || payload.message || "Scorecard unavailable."
        },
        { status: 502 }
      );
    }

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "s-maxage=300, stale-while-revalidate=120"
      }
    });
  } catch {
    return NextResponse.json(
      {
        status: "failure",
        reason: "Unable to fetch scorecard."
      },
      { status: 502 }
    );
  }
}