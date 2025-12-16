import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const slug = (await params).slug;

  if (!slug) {
    return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
  }

  try {
    // Try the public Kick API endpoint first (faster, no auth required)
    // This is what Kick's frontend uses
    const response = await fetch(`https://kick.com/api/v2/channels/${slug}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://kick.com/',
        'Origin': 'https://kick.com',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
      },
      next: { revalidate: 60 } // Cache for 60 seconds to reduce rate limiting
    });

    if (response.ok) {
      const data = await response.json();

      // Normalize the data structure
      if (data) {
        // V2 API has slightly different structure - normalize it
        if (data.user && !data.user.profile_pic && data.user.profilepic) {
          data.user.profile_pic = data.user.profilepic;
        }

        // Ensure livestream is accessible
        if (!data.livestream) {
          data.livestream = null;
        }
      }

      return NextResponse.json(data);
    }

    // If v2 fails, try v1
    const v1Response = await fetch(`https://kick.com/api/v1/channels/${slug}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://kick.com/',
        'Origin': 'https://kick.com',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
      },
      next: { revalidate: 60 }
    });

    if (v1Response.ok) {
      const data = await v1Response.json();

      // Normalize the data
      if (data && data.user) {
        if (!data.user.profile_pic && data.user.profilepic) {
          data.user.profile_pic = data.user.profilepic;
        }
      }

      return NextResponse.json(data);
    }

    // Both failed - return error
    console.error(`Both API endpoints failed for ${slug}: v2=${response.status}, v1=${v1Response.status}`);
    return NextResponse.json({
      error: 'Failed to fetch channel data',
      slug: slug,
      attempts: ['v2', 'v1']
    }, { status: 500 });

  } catch (error) {
    console.error('Error fetching kick data:', error);
    return NextResponse.json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
