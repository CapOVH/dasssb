'use client';

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });

// Define the interface for our Streamer data
interface Streamer {
  name: string;
  slug: string;
  viewers: number;
  image: string;
  thumbnail: string;
  status: 'online' | 'offline';
  title?: string;
  category?: string;
  language?: string;
  bio?: string;
  playback_url?: string;
}

const STREAMER_SLUGS = [
  'adinross',
  'cheesur',
  'iziprime',
  'cuffem',
  'shnaggyhose',
  'konvy',
  'markynextdoor',
  'sweatergxd',
];

export default function Home() {
  const router = useRouter();
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFeaturedIndex, setCurrentFeaturedIndex] = useState(0);
  const [playbackError, setPlaybackError] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Default to muted for better UX (browsers block autoplay audio)

  useEffect(() => {
    const fetchStreamers = async () => {
      const promises = STREAMER_SLUGS.map(async (slug) => {
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
          try {
            // Try fetching from Kick API with retry logic
            let res = await fetch(`https://kick.com/api/v2/channels/${slug}`, {
              headers: {
                'Accept': 'application/json',
              },
            });

            // Try v1 if v2 fails
            if (!res.ok) {
              res = await fetch(`https://kick.com/api/v1/channels/${slug}`, {
                headers: {
                  'Accept': 'application/json',
                },
              });
            }

            if (!res.ok) {
              throw new Error(`HTTP ${res.status}`);
            }

            const data = await res.json();

            // Validate that we got actual data
            if (!data || !data.user) {
              throw new Error('Invalid data structure');
            }

            return parseStreamerData(data, slug);
          } catch (error) {
            attempts++;
            console.warn(`Attempt ${attempts}/${maxAttempts} failed for ${slug}:`, error);

            if (attempts < maxAttempts) {
              // Exponential backoff: wait 500ms, 1s, 2s
              await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempts - 1)));
              continue;
            }

            // All attempts failed - return offline fallback
            console.warn(`All attempts failed for ${slug} (displaying as offline)`);
            return {
              name: slug,
              slug: slug,
              viewers: 0,
              image: 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=300&h=300&fit=crop',
              thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=450&fit=crop',
              status: 'offline' as 'online' | 'offline',
              title: 'Offline',
              category: 'Offline',
            };
          }
        }

        // Fallback (should never reach here)
        return {
          name: slug,
          slug: slug,
          viewers: 0,
          image: 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=300&h=300&fit=crop',
          thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=450&fit=crop',
          status: 'offline' as 'online' | 'offline',
          title: 'Offline',
          category: 'Offline',
        };
      });

      const results = await Promise.all(promises);
      setStreamers(results);
      setLoading(false);
    };

    fetchStreamers();
    const interval = setInterval(fetchStreamers, 60000);
    return () => clearInterval(interval);
  }, []);

  // Helper function to parse streamer data with validation
  const parseStreamerData = (data: any, slug: string) => {
    try {
      const isLive = data.livestream !== null && data.livestream !== undefined;
      const playbackUrl = data.playback_url || data.livestream?.playback_url || null;

      // Robust profile picture extraction with multiple fallbacks
      const profilePic = data.user?.profile_pic ||
        data.user?.profilepic ||
        data.user?.avatar ||
        data.profilepic ||
        null;

      let thumb = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=450&fit=crop';

      if (isLive && data.livestream?.thumbnail?.url) {
        try {
          thumb = data.livestream.thumbnail.url.replace('{width}', '1280').replace('{height}', '720');
        } catch (e) {
          console.warn('Failed to parse thumbnail URL');
        }
      } else if (!isLive && profilePic) {
        thumb = 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=450&fit=crop';
      }

      // Extract stats with multiple fallbacks
      const followersCount = data.followers_count ||
        data.user?.followers_count ||
        data.followersCount ||
        0;

      const subscribersCount = data.subscriber_badges?.length ||
        data.subscribers_count ||
        data.subscription_count ||
        0;

      const totalViews = data.user?.total_views ||
        data.user?.views_count ||
        data.views_count ||
        data.total_views ||
        0;

      return {
        name: data.user?.username || data.slug || slug,
        slug: slug,
        viewers: isLive ? (data.livestream.viewer_count || 0) : 0,
        image: profilePic || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=300&h=300&fit=crop',
        thumbnail: thumb,
        status: isLive ? 'online' : ('offline' as 'online' | 'offline'),
        title: isLive ? (data.livestream.session_title || 'Live Now') : 'Offline',
        category: isLive ? (data.livestream.categories?.[0]?.name || 'Just Chatting') : 'Just Chatting',
        language: data.livestream?.language || 'English',
        bio: data.user?.bio || '',
        playback_url: playbackUrl,
        followers: followersCount,
        subscribers: subscribersCount,
        totalViews: totalViews,
      };
    } catch (error) {
      console.error('Error parsing streamer data:', error);
      // Return safe fallback if parsing fails
      return {
        name: slug,
        slug: slug,
        viewers: 0,
        image: 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=300&h=300&fit=crop',
        thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=450&fit=crop',
        status: 'offline' as 'online' | 'offline',
        title: 'Offline',
        category: 'Offline',
        language: 'English',
        bio: '',
        playback_url: null,
        followers: 0,
        subscribers: 0,
        totalViews: 0,
      };
    }
  };

  // Reset error when featured streamer changes
  useEffect(() => {
    setPlaybackError(false);
  }, [currentFeaturedIndex]);

  const onlineStreamers = streamers.filter((s) => s.status === 'online');
  const offlineStreamers = streamers.filter((s) => s.status === 'offline');

  // Carousel Logic
  const featuredStreamers = onlineStreamers.length > 0 ? onlineStreamers : streamers.slice(0, 5); // Show online or fallbacks

  const handleNext = () => {
    setCurrentFeaturedIndex((prev) => (prev + 1) % featuredStreamers.length);
  };

  const handlePrev = () => {
    setCurrentFeaturedIndex((prev) => (prev - 1 + featuredStreamers.length) % featuredStreamers.length);
  };

  const featured = featuredStreamers[currentFeaturedIndex];


  return (
    <>
      <Header />

      <div className="bg-[#1A1C1D] z-[200] fixed inset-0 w-full h-full pointer-events-none select-none duration-1000 opacity-100" style={{ opacity: 0 }}></div>

      <div style={{ textAlign: 'center', margin: '4rem 0 2rem' }}>
        <h1 style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: '900',
          fontSize: '3.5rem',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '15px'
        }}>
          WATCH SSB LIVE!
          <svg className="star star-right" width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10.5 0L10.9982 6.54715C11.1387 8.39378 12.6062 9.86131 14.4529 10.0018L21 10.5L14.4528 10.9982C12.6062 11.1387 11.1387 12.6062 10.9982 14.4529L10.5 21L10.0018 14.4528C9.86131 12.6062 8.39378 11.1387 6.54715 10.9982L0 10.5L6.54715 10.0018C8.39378 9.86131 9.86131 8.39378 10.0018 6.54715L10.5 0Z" fill="#53FC18"></path>
          </svg>
        </h1>
      </div>

      {/* FEATURED CAROUSEL */}
      <div className="container" style={{ marginBottom: '2rem' }}>
        {featured && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', position: 'relative' }}>
            <button onClick={handlePrev} style={{ background: '#24272c', border: 'none', color: 'white', padding: '10px 15px', borderRadius: '4px', cursor: 'pointer', zIndex: 10 }}>&lt;</button>

            <div style={{ display: 'flex', width: '100%', maxWidth: '900px', background: '#0b0e0f', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
              {/* Video Preview Side (Left) */}
              <div style={{ flex: 2, position: 'relative', cursor: 'pointer', minHeight: '450px', backgroundColor: 'black' }} onClick={() => router.push(`/stream/${featured.slug}`)}>
                {featured.status === 'online' ? (
                  <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
                    <iframe
                      src={`https://player.kick.com/${featured.slug}?muted=${isMuted}&autoplay=true`}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        // Enable pointer events so controls work
                      }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      title={`${featured.name} Live Preview`}
                    />
                  </div>
                ) : (
                  <img src={featured.thumbnail} alt={featured.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                )}

                {/* Live Tag overlay */}
                {featured.status === 'online' && (
                  <div style={{ position: 'absolute', top: '10px', left: '10px', background: '#53FC18', color: 'black', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.8rem', zIndex: 5, pointerEvents: 'none' }}>LIVE</div>
                )}

                {/* Mute Toggle Button */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMuted(!isMuted);
                  }}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    padding: '8px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    zIndex: 25,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #53FC18'
                  }}
                >
                  {isMuted ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5.889 16H2C1.448 16 1 15.552 1 15V9C1 8.448 1.448 8 2 8H5.889L10.889 3H12V21H10.889L5.889 16ZM24 21L20 17L16 21L14 19L18 15L14 11L16 9L20 13L24 9L26 11L22 15L26 19L24 21Z" fill="#53FC18" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5.889 16H2C1.448 16 1 15.552 1 15V9C1 8.448 1.448 8 2 8H5.889L10.889 3H12V21H10.889L5.889 16ZM20.485 12.001C20.485 14.305 19.167 16.278 17.25 17.228V19.34C20.315 18.28 22.485 15.385 22.485 12.001C22.485 8.617 20.315 5.722 17.25 4.662V6.774C19.167 7.724 20.485 9.697 20.485 12.001ZM17.25 12.001C17.25 10.421 16.329 9.061 15 8.358V15.645C16.329 14.941 17.25 13.581 17.25 12.001Z" fill="#53FC18" />
                    </svg>
                  )}
                </div>

                {/* Viewer Count overlay */}
                {featured.status === 'online' && (
                  <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', zIndex: 5, pointerEvents: 'none' }}>
                    {featured.viewers.toLocaleString()} viewers
                  </div>
                )}
                {/* Click overlay - Covers top 85% to allow navigation, leaves bottom 15% for controls */}
                <div
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '85%', zIndex: 4, cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent bubbling if needed
                    router.push(`/stream/${featured.slug}`);
                  }}
                ></div>
              </div>

              {/* Info Side (Right) - With Chat */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#14171a', borderLeft: '1px solid #333' }}>
                {/* Header - Clickable */}
                <div
                  style={{ padding: '15px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #222', cursor: 'pointer' }}
                  onClick={() => router.push(`/stream/${featured.slug}`)}
                >
                  <img src={featured.image} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #53FC18' }} alt="Avatar" />
                  <div style={{ overflow: 'hidden' }}>
                    <h3 style={{ margin: 0, color: '#53FC18', fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{featured.name}</h3>
                    <span style={{ color: '#aaa', fontSize: '0.8rem' }}>{featured.category}</span>
                  </div>
                </div>

                {/* Chat Embed */}
                <div style={{ flex: 1, position: 'relative', width: '100%' }}>
                  <iframe
                    src={`https://kick.com/popout/${featured.slug}/chat`}
                    style={{ width: '100%', height: '100%', border: 'none', background: '#0b0e0f' }}
                    title="Chat"
                  />
                  {/* Chat Overlay for Click-through if needed, or remove to allow chatting */}
                  {/* We likely want the user to be able to read chat but clicking might need to go to stream page. 
                       However, allowing interaction with chat is cool. Let's allowing interaction. */}
                </div>
              </div>
            </div>

            <button onClick={handleNext} style={{ background: '#24272c', border: 'none', color: 'white', padding: '10px 15px', borderRadius: '4px', cursor: 'pointer', zIndex: 10 }}>&gt;</button>
          </div>
        )}
      </div>

      <div id="main" className="main--fullfeatured container">
        {/* ONLINE STREAMERS SECTION */}
        <div className="streamer-title streamer-on">
          <div className="pulsating-circle">
            <div className="circle circle-pulse" style={{ backgroundColor: '#53FC18' }}></div>
            <div className="circle" style={{ backgroundColor: '#53FC18' }}></div>
          </div>
          <span>{loading ? '...' : onlineStreamers.length} Online Now</span>
        </div>

        <div className="panel-grid">
          {loading ? (
            <div style={{ color: 'white', padding: '20px' }}>Loading Live Status...</div>
          ) : (
            onlineStreamers.length > 0 ? onlineStreamers.map((streamer) => (
              <Link href={`/stream/${streamer.slug}`} key={streamer.slug} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="streamer-panel true watched">
                  <div className="streamer__image">
                    <img className="streamer__image__inner" src={streamer.image} alt={streamer.name} />
                    <div className="streamer__active" style={{ borderColor: '#53FC18' }}></div>
                  </div>
                  <div className="streamer__info">
                    <span className="streamer__name">{streamer.name}</span>
                    <span className="streamer__viewers">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 9.5C8.39782 9.5 8.77936 9.34196 9.06066 9.06066C9.34196 8.77936 9.5 8.39782 9.5 8C9.5 7.60218 9.34196 7.22064 9.06066 6.93934C8.77936 6.65804 8.39782 6.5 8 6.5C7.60218 6.5 7.22064 6.65804 6.93934 6.93934C6.65804 7.22064 6.5 7.60218 6.5 8C6.5 8.39782 6.65804 8.77936 6.93934 9.06066C7.22064 9.34196 7.60218 9.5 8 9.5Z" fill="#53FC18"></path>
                        <path fillRule="evenodd" clipRule="evenodd" d="M1.37996 8.27987C1.31687 8.09648 1.31687 7.89727 1.37996 7.71387C1.85633 6.33724 2.75014 5.14343 3.93692 4.29869C5.1237 3.45394 6.54437 3.00032 8.00109 3.00098C9.45782 3.00164 10.8781 3.45655 12.0641 4.30237C13.2501 5.14819 14.1428 6.34281 14.618 7.71987C14.681 7.90327 14.681 8.10248 14.618 8.28587C14.1418 9.66286 13.248 10.857 12.0611 11.7021C10.8742 12.5471 9.4533 13.0009 7.99632 13.0002C6.53934 12.9996 5.11883 12.5445 3.9327 11.6984C2.74657 10.8523 1.85387 9.65729 1.37896 8.27987H1.37996ZM11 7.99987C11 8.79552 10.6839 9.55859 10.1213 10.1212C9.55867 10.6838 8.79561 10.9999 7.99996 10.9999C7.20431 10.9999 6.44125 10.6838 5.87864 10.1212C5.31603 9.55859 4.99996 8.79552 4.99996 7.99987C4.99996 7.20422 5.31603 6.44116 5.87864 5.87855C6.44125 5.31594 7.20431 4.99987 7.99996 4.99987C8.79561 4.99987 9.55867 5.31594 10.1213 5.87855C10.6839 6.44116 11 7.20422 11 7.99987Z" fill="#53FC18"></path>
                      </svg>
                      {streamer.viewers.toLocaleString()}
                      <svg className="circle" width="4" height="4" viewBox="0 0 4 4" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="2" cy="2" r="2" fill="#53FC18" fillOpacity="0.5"></circle>
                      </svg>
                      tap to watch
                    </span>
                  </div>
                </div>
              </Link>
            )) : <div style={{ color: '#888', padding: '10px' }}>No streamers are currently live.</div>
          )}
        </div>

        {/* OFFLINE STREAMERS SECTION */}
        <div className="streamer-title streamer-off">
          <div className="pulsating-circle">
            <div className="circle circle-gray"></div>
          </div>
          <span>Offline Streamers</span>
        </div>

        <div className="panel-grid">
          {offlineStreamers.map((streamer) => (
            <Link href={`/stream/${streamer.slug}`} key={streamer.slug} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="streamer-panel false">
                <div className="streamer__image">
                  {/* Grayscale filter for offline */}
                  <img className="streamer__image__inner" src={streamer.image} alt={streamer.name} style={{ filter: 'grayscale(100%)' }} />
                </div>
                <div className="streamer__info">
                  <span className="streamer__name">{streamer.name}</span>
                  <span className="streamer__viewers">Offline</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Footer />
    </>
  );
}
