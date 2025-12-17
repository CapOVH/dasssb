import { SessionOptions } from 'iron-session';

export interface UserSession {
    id: string;
    username: string;
    points: number;
    isLoggedIn: boolean;
}

export const sessionOptions: SessionOptions = {
    password: process.env.SECRET_COOKIE_PASSWORD || 'complex_password_at_least_32_characters_long',
    cookieName: 'ssb_session',
    cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
    },
};

declare module 'iron-session' {
    interface IronSessionData {
        user?: UserSession;
    }
}
