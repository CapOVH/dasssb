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
    // Try multiple endpoints with retry logic
    const endpoints = [
      `https://kick.com/api/v2/channels/${slug}`,
      `https://kick.com/api/v1/channels/${slug}`
    ];

    let lastError: any = null;

    for (const url of endpoints) {
      // Try each endpoint multiple times
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          console.log(`Fetching ${slug} from ${url} (attempt ${attempt + 1}/3)`);

          const response = await fetch(url, {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept-Language': 'en-US,en;q=0.9',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
              'Referer': 'https://kick.com/',
              'Origin': 'https://kick.com'
            },
            next: { revalidate: 0 },
            cache: 'no-store'
          });

          if (response.ok) {
            const data = await response.json();

            // Validate data structure
            if (!data || !data.user) {
              console.warn(`Invalid data structure for ${slug}`);
              continue;
            }

            // Normalize data to ensure consistency
            const normalizedData = {
              ...data,
              user: {
                ...data.user,
                profile_pic: data.user?.profile_pic ||
                  data.user?.profilepic ||
                  data.user?.avatar ||
                  `https://ui-avatars.com/api/?name=${slug}&background=53FC18&color=000&size=300`
              },
              livestream: data.livestream || null
            };

            console.log(`Successfully fetched ${slug}:`, {
              username: normalizedData.user.username,
              isLive: !!normalizedData.livestream,
              hasProfilePic: !!normalizedData.user.profile_pic
            });

            // Add CORS headers to response
            return NextResponse.json(normalizedData, {
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              }
            });
          }

          lastError = new Error(`HTTP ${response.status}`);
        } catch (e: any) {
          lastError = e;
          console.warn(`Attempt ${attempt + 1} failed for ${url}:`, e.message);

          // Wait before retry with exponential backoff
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)));
          }
        }
      }
    }

    // All attempts failed - return fallback data
    console.error(`All attempts failed for ${slug}, returning fallback`);

    return NextResponse.json({
      slug: slug,
      user: {
        id: 0,
        username: slug,
        profile_pic: `https://ui-avatars.com/api/?name=${slug}&background=53FC18&color=000&size=300`,
        bio: ''
      },
      livestream: null,
      followers_count: 0
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Critical error fetching kick data:', error);

    return NextResponse.json({
      slug: slug,
      user: {
        id: 0,
        username: slug,
        profile_pic: `https://ui-avatars.com/api/?name=${slug}&background=53FC18&color=000&size=300`,
        bio: ''
      },
      livestream: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 200, // Return 200 with fallback data instead of error
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
