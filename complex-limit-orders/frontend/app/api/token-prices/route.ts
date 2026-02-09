import { NextRequest, NextResponse } from 'next/server';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Cache for 60 seconds
export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ids = searchParams.get('ids');

    if (!ids) {
      return NextResponse.json({ error: 'Missing ids parameter' }, { status: 400 });
    }

    const url = `${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BiteSwap/1.0',
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      console.error('CoinGecko API error:', response.status, response.statusText);
      return NextResponse.json({}, { status: 200 }); // Return empty prices on error
    }

    const data = await response.json();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
      },
    });
  } catch (error) {
    console.error('Token prices API error:', error);
    return NextResponse.json({}, { status: 200 }); // Return empty prices on error
  }
}
