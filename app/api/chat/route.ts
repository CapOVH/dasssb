
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'chat.json');

interface ChatMessage {
    id: string;
    user: string;
    text: string;
    timestamp: number;
    color: string;
    badge?: string;
    isSystem?: boolean;
    isHype?: boolean;
}

function getMessages(): Record<string, ChatMessage[]> {
    try {
        if (!fs.existsSync(DATA_FILE)) return {};
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return {};
    }
}

function saveMessage(roomId: string, message: ChatMessage) {
    try {
        const allMessages = getMessages();
        if (!allMessages[roomId]) allMessages[roomId] = [];

        allMessages[roomId].push(message);

        // Limit history to last 100 messages per room
        if (allMessages[roomId].length > 100) {
            allMessages[roomId] = allMessages[roomId].slice(-100);
        }

        const dir = path.dirname(DATA_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        fs.writeFileSync(DATA_FILE, JSON.stringify(allMessages, null, 2));
        return allMessages[roomId];
    } catch (e) {
        console.error("Error saving message", e);
        return [];
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId') || 'global';

    // Add default welcome message if room is empty
    const all = getMessages();
    let roomMessages = all[roomId] || [];

    if (roomMessages.length === 0) {
        const displayName = roomId === 'global' ? 'Global' : roomId.replace('stream_', '') + "'s Room";
        roomMessages = [
            { id: '1', user: 'System', text: `Welcome to ${displayName} Chat!`, timestamp: Date.now(), color: '#53FC18', isSystem: true }
        ];
    }

    return NextResponse.json(roomMessages);
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { roomId = 'global', message } = body;

        if (!message) return NextResponse.json({ error: 'No message provided' }, { status: 400 });

        const updatedMessages = saveMessage(roomId, message);
        return NextResponse.json(updatedMessages);
    } catch (e) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
