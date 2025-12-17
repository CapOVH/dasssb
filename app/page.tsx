'use client';

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PredictionWidget from '../components/PredictionWidget';

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
  'markynextdoot',
  'sweatergxd',
  'xqc',
  'jakefuture27',
  'jollyrancherzoo',
  '6ix9ine',
  'quillysilly',
];

const COLLAB_SLUGS = [
  'xqc',
  'jakefuture27',
  'jollyrancherzoo',
  '6ix9ine',
  'quillysilly',
];

export default function Home() {
  const router = useRouter();
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFeaturedIndex, setCurrentFeaturedIndex] = useState(0);
  const [playbackError, setPlaybackError] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Default to muted for better UX (browsers block autoplay audio)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Versus Mode State
  const [versusOpen, setVersusOpen] = useState(false);
  const [selectedFighters, setSelectedFighters] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false); // Added state

  const availableFighters = [
    { name: 'AdinRoss', slug: 'adinross', image: 'https://files.kick.com/images/user/904404/profile_image/conversion/09168fc3-77cf-4d10-a5d9-249ac0aa6dd7-fullsize.webp' },
    { name: 'xQc', slug: 'xqc', image: 'https://files.kick.com/images/user/9519187/profile_image/conversion/1f114674-3253-48b4-b903-88849647248c-fullsize.webp' },
    { name: 'N3on', slug: 'n3on', image: 'https://files.kick.com/images/user/3866299/profile_image/conversion/3f7e6e88-005a-464a-a64c-7c5e2d837648-fullsize.webp' }
  ];

  const handleFighterSelect = (slug: string) => {
    if (selectedFighters.includes(slug)) {
      setSelectedFighters(prev => prev.filter(s => s !== slug));
    } else {
      if (selectedFighters.length < 2) {
        setSelectedFighters(prev => [...prev, slug]);
      }
    }
  };

  const startBattle = () => {
    if (selectedFighters.length === 2) {
      const [p1, p2] = selectedFighters;
      router.push(`/versus?p1=${p1}&p2=${p2}`);
    }
  };

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

  // Admin Check
  useEffect(() => {
    const checkAdmin = () => {
      try {
        const u = JSON.parse(localStorage.getItem('ssb_current_user') || '{}');
        if (u.username?.toLowerCase() === 'reese' || u.role === 'admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (e) { setIsAdmin(false); }
    };

    checkAdmin();
    // Listen for auth changes (if user logs in/out without refresh)
    window.addEventListener('ssb_auth_changed', checkAdmin);
    return () => window.removeEventListener('ssb_auth_changed', checkAdmin);
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

  // Filter out Collab streamers from the main grids
  const visibleOnlineStreamers = onlineStreamers.filter(s => !COLLAB_SLUGS.includes(s.slug.toLowerCase()));
  const visibleOfflineStreamers = offlineStreamers.filter(s => !COLLAB_SLUGS.includes(s.slug.toLowerCase()));

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
          WATCH SSB
          <svg className="star star-right" width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10.5 0L10.9982 6.54715C11.1387 8.39378 12.6062 9.86131 14.4529 10.0018L21 10.5L14.4528 10.9982C12.6062 11.1387 11.1387 12.6062 10.9982 14.4529L10.5 21L10.0018 14.4528C9.86131 12.6062 8.39378 11.1387 6.54715 10.9982L0 10.5L6.54715 10.0018C8.39378 9.86131 9.86131 8.39378 10.0018 6.54715L10.5 0Z" fill="#53FC18"></path>
          </svg>
        </h1>
      </div>

      {/* FEATURED CAROUSEL (STACKED) */}
      <div className="container" style={{ marginBottom: '2rem', marginTop: '2rem', perspective: '1000px' }}>
        {featuredStreamers.length > 0 && (
          <div style={{ position: 'relative', height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Render all featured streamers but style them based on position */}
            {featuredStreamers.map((streamer, index) => {
              // Calculate offset from current index
              let offset = index - currentFeaturedIndex;

              // Handle wrapping correctly for infinite loop visual
              if (offset > featuredStreamers.length / 2) offset -= featuredStreamers.length;
              if (offset < -featuredStreamers.length / 2) offset += featuredStreamers.length;

              // Only show items close to center to save resources, but keep DOM lightweight
              if (Math.abs(offset) > 2) return null; // Hide far items

              const isCenter = offset === 0;
              const isLeft = offset < 0;
              const isRight = offset > 0;

              // Styles for Stacked Effect
              const zIndex = isCenter ? 20 : 10 - Math.abs(offset);
              const scale = isCenter ? 1 : 0.85;
              const translateX = isCenter ? '0%' : (isLeft ? '-15%' : '15%');
              const opacity = isCenter ? 1 : 0.4;
              const brightness = isCenter ? 'brightness(1)' : 'brightness(0.5)';

              return (
                <div
                  key={streamer.slug}
                  style={{
                    position: 'absolute',
                    width: '100%',
                    maxWidth: '900px',
                    height: '450px',
                    transition: 'all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)',
                    transform: `translateX(${translateX}) scale(${scale})`,
                    zIndex: zIndex,
                    opacity: opacity,
                    filter: brightness,
                    background: '#0b0e0f',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: isCenter ? '0 10px 40px rgba(0,0,0,0.8)' : 'none',
                    display: 'flex'
                  }}
                >
                  {/* Left Side: Preview */}
                  <div style={{ flex: 2, position: 'relative', backgroundColor: 'black' }} onClick={() => isCenter && router.push(`/stream/${streamer.slug}`)}>
                    {isCenter && streamer.status === 'online' ? (
                      <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
                        <iframe
                          src={`https://player.kick.com/${streamer.slug}?muted=${isMuted}&autoplay=true`}
                          style={{ width: '100%', height: '100%', border: 'none', pointerEvents: isCenter ? 'auto' : 'none' }}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          title={`${streamer.name} Live Preview`}
                        />
                        {/* Mute Toggle (Center Only) */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsMuted(!isMuted);
                          }}
                          style={{
                            position: 'absolute',
                            top: '15px',
                            right: '15px',
                            background: 'rgba(0,0,0,0.6)',
                            color: 'white',
                            padding: '8px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            zIndex: 30,
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
                      </div>
                    ) : (
                      <img src={streamer.thumbnail} alt={streamer.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}

                    {/* Live Badge */}
                    {streamer.status === 'online' && (
                      <div style={{ position: 'absolute', top: '15px', left: '15px', background: '#53FC18', color: 'black', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.8rem', zIndex: 20 }}>LIVE</div>
                    )}

                    {/* Overlay for Click (if not center iframe) */}
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10, cursor: 'pointer' }} onClick={() => {
                      if (isCenter) router.push(`/stream/${streamer.slug}`);
                      else if (isLeft) handlePrev();
                      else if (isRight) handleNext();
                    }}></div>
                  </div>

                  {/* Right Side: Details */}
                  <div style={{ flex: 1, backgroundColor: '#14171a', borderLeft: '1px solid #333', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                      <img src={streamer.image} alt="Avatar" style={{ width: '50px', height: '50px', borderRadius: '50%', border: '2px solid #53FC18', marginRight: '15px' }} />
                      <div>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'white' }}>{streamer.name}</h2>
                        <span style={{ color: '#53FC18' }}>{streamer.viewers.toLocaleString()} viewers</span>
                      </div>
                    </div>
                    <div style={{ background: '#24272c', padding: '8px 12px', borderRadius: '6px', width: 'fit-content', marginBottom: '15px', color: '#ccc', fontSize: '0.9rem' }}>
                      {streamer.language}
                    </div>
                    <p style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: '1.4' }}>
                      {streamer.title}
                    </p>

                  </div>

                </div>
              );
            })}

            {/* Controls */}
            <button
              onClick={handlePrev}
              style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', zIndex: 50, background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', padding: '15px', borderRadius: '50%', cursor: 'pointer' }}
              className="hover:bg-green-500 hover:text-black transition-colors"
            >
              &lt;
            </button>
            <button
              onClick={handleNext}
              style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', zIndex: 50, background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', padding: '15px', borderRadius: '50%', cursor: 'pointer' }}
              className="hover:bg-green-500 hover:text-black transition-colors"
            >
              &gt;
            </button>

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
          <span>{loading ? '...' : visibleOnlineStreamers.length} Online Now</span>
        </div>

        <div className="panel-grid">
          {loading ? (
            <div style={{ color: 'white', padding: '20px' }}>Loading Live Status...</div>
          ) : (
            visibleOnlineStreamers.length > 0 ? visibleOnlineStreamers.map((streamer) => (
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
          {visibleOfflineStreamers.map((streamer) => (
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

      {/* Others Sidebar */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100%',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(calc(100% - 40px))',
          transition: 'transform 0.3s ease-in-out'
        }}
      >
        {/* Toggle Tab */}
        <div
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            width: '40px',
            height: '120px',
            background: '#53FC18',
            borderTopLeftRadius: '10px',
            borderBottomLeftRadius: '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '-2px 0 10px rgba(0,0,0,0.5)'
          }}
        >
          <div style={{ transform: 'rotate(-90deg)', whiteSpace: 'nowrap', fontWeight: 'bold', color: 'black' }}>
            OTHERS
          </div>
        </div>

        {/* Sidebar Content */}
        <div style={{ width: '250px', height: '100%', background: '#0b0e0f', borderLeft: '1px solid #333', padding: '20px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

          {/* Menu Section */}
          <h3 style={{ color: 'white', marginBottom: '15px', borderBottom: '1px solid #333', paddingBottom: '10px', fontSize: '0.9rem', letterSpacing: '1px' }}>MENU</h3>

          <button
            onClick={() => router.push('/multiview')}
            style={{
              background: '#1f2223',
              border: '1px solid #333',
              color: 'white',
              padding: '12px',
              borderRadius: '8px',
              cursor: 'pointer',
              marginBottom: '10px',
              textAlign: 'left',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.2s'
            }}
            className="hover:border-[#53FC18] hover:text-[#53FC18]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            Multi View
          </button>

          <button
            onClick={() => setVersusOpen(true)}
            style={{
              background: 'linear-gradient(45deg, #1f2223, #2a0a0a)',
              border: '1px solid #ff4444',
              color: '#ff4444',
              padding: '12px',
              borderRadius: '8px',
              cursor: 'pointer',
              marginBottom: '30px',
              textAlign: 'left',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.2s'
            }}
            className="hover:brightness-125"
          >
            ⚔️ Versus Mode
          </button>

          {isAdmin && (
            <button
              onClick={() => router.push('/admin')}
              style={{
                background: 'linear-gradient(45deg, #1f2223, #2a200a)',
                border: '1px solid #FFD700',
                color: '#FFD700',
                padding: '12px',
                borderRadius: '8px',
                cursor: 'pointer',
                marginBottom: '30px',
                textAlign: 'left',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.2s',
                marginTop: '-20px' // Pull it up closer to Versus
              }}
              className="hover:brightness-125"
            >
              🛡️ Admin Panel
            </button>
          )}

          {/* Featured Collabs */}
          <h3 style={{ color: 'white', marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>FEATURED COLLABS</h3>

          {COLLAB_SLUGS.map((slug) => {
            const streamer = streamers.find(s => s.slug.toLowerCase() === slug.toLowerCase());
            const displayName = streamer ? streamer.name : slug;
            const profilePic = streamer ? streamer.image : 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=100&h=100&fit=crop';
            const isLive = streamer?.status === 'online';

            return (
              <button
                key={slug}
                onClick={() => router.push(`/stream/${slug}`)}
                style={{
                  background: isLive ? 'linear-gradient(45deg, #1f2223, #141617)' : '#1f2223',
                  border: isLive ? '1px solid #53FC18' : '1px solid #333',
                  color: 'white',
                  padding: '10px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '10px',
                  transition: 'all 0.2s',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.borderColor = '#53FC18';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.borderColor = isLive ? '#53FC18' : '#333';
                }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img src={profilePic} alt={displayName} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                  {isLive && <div style={{ position: 'absolute', bottom: -2, right: -2, width: '10px', height: '10px', background: '#53FC18', borderRadius: '50%', border: '2px solid #1f2223' }}></div>}
                </div>
                <div style={{ overflow: 'hidden', minWidth: 0 }}>
                  <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.9rem' }}>{displayName}</div>
                  {isLive && <div style={{ color: '#53FC18', fontSize: '0.7rem' }}>LIVE</div>}
                </div>
              </button>
            );
          })}

          <p style={{ color: '#888', fontSize: '0.8rem', textAlign: 'center', marginTop: '10px' }}>
            Check out the latest Exclusive collaboration streams!
          </p>
        </div>
      </div>

      {/* Versus Selection Modal */}
      {versusOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0.8)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(5px)'
        }} onClick={() => setVersusOpen(false)}>
          <div style={{
            background: '#14171a',
            border: '2px solid #ff4444',
            borderRadius: '16px',
            padding: '30px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 0 50px rgba(255,0,0,0.2)'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: 'white', margin: '0 0 10px 0', textAlign: 'center', fontFamily: "'Impact', sans-serif", letterSpacing: '2px', fontSize: '2rem' }}>
              <span style={{ color: '#ff4444' }}>⚔️</span> SELECT LIVE FIGHTERS
            </h2>
            <p style={{ color: '#888', textAlign: 'center', marginBottom: '25px', fontSize: '0.9rem' }}>
              Select 2 LIVE streamers to battle
            </p>

            {streamers.filter(s => s.status === 'online').length < 2 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>😴</div>
                Not enough streamers are live right now for a battle.<br />
                Check back later!
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                  {streamers.filter(s => s.status === 'online').map(streamer => (
                    <div
                      key={streamer.slug}
                      onClick={() => handleFighterSelect(streamer.slug)}
                      style={{
                        cursor: 'pointer',
                        border: selectedFighters.includes(streamer.slug) ? '2px solid #53FC18' : '2px solid #333',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        position: 'relative',
                        background: '#0b0e0f',
                        transition: 'all 0.2s',
                        transform: selectedFighters.includes(streamer.slug) ? 'scale(1.05)' : 'scale(1)',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1' }}>
                        <img src={streamer.image} alt={streamer.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{
                          position: 'absolute',
                          top: '5px',
                          right: '5px',
                          background: '#ff0000',
                          color: 'white',
                          fontSize: '0.6rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 'bold'
                        }}>LIVE</div>
                      </div>
                      <div style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: 'white', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {streamer.name}
                      </div>
                      {selectedFighters.includes(streamer.slug) && (
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(83, 252, 24, 0.2)', border: '2px solid #53FC18' }}></div>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={startBattle}
                  disabled={selectedFighters.length !== 2}
                  style={{
                    width: '100%',
                    padding: '15px',
                    background: selectedFighters.length === 2 ? 'linear-gradient(45deg, #53FC18, #2ea40c)' : '#333',
                    color: selectedFighters.length === 2 ? 'black' : '#666',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    fontSize: '1.2rem',
                    cursor: selectedFighters.length === 2 ? 'pointer' : 'not-allowed',
                    textTransform: 'uppercase',
                    transition: 'all 0.2s',
                    letterSpacing: '1px'
                  }}
                >
                  Start Battle
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <PredictionWidget streamers={streamers} />
    </>
  );
}
