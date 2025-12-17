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
        const response = await fetch(`https://kick.com/api/v2/channels/${slug}/clips`, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            next: { revalidate: 30 }
        });

        if (response.ok) {
            const data = await response.json();
            return NextResponse.json(data);
        }

        // Return empty clips array on failure instead of error, so main ui doesn't break
        return NextResponse.json({ clips: [] });

    } catch (error) {
        console.error('Error fetching kick clips data:', error);
        return NextResponse.json({ clips: [] });
    }
}
