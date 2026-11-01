import { NextResponse } from "next/server";

export const revalidate = 900;

export async function GET() {
  const apiKey = process.env.CRICKET_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { status: "failure", reason: "CRICKET_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  try {
    const url = new URL("https://api.cricapi.com/v1/currentMatches");
    url.searchParams.set("apikey", apiKey);
    url.searchParams.set("offset", "0");

    const response = await fetch(url.toString(), {
      next: { revalidate: 900 },
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      return NextResponse.json(
        { status: "failure", reason: `Cricket provider returned HTTP ${response.status}.` },
        { status: 502 }
      );
    }

    const payload = await response.json();
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "s-maxage=900, stale-while-revalidate=300" }
    });
  } catch {
    return NextResponse.json(
      { status: "failure", reason: "Could not reach the cricket data provider." },
      { status: 502 }
    );
  }
}
