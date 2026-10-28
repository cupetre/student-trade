import type { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

// index.js refuses to start without JWT_SECRET, so it's always set here
const JWT_SECRET = process.env.JWT_SECRET as string;

function authenticationToken(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided', code: 'NO_TOKEN' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err || !decoded) {
            // 401 = "log in again". 403 is kept for "logged in, but not allowed"
            // (e.g. an unfinished profile), so the client can tell them apart.
            return res.status(401).json({ error: 'Your session has expired. Please log in again.', code: 'INVALID_TOKEN' });
        }

        // jwt.verify's callback hands back `string | JwtPayload` — TypeScript
        // makes you deal with that ambiguity instead of letting it slide.
        // The plain-JS version just did `req.user = user` and trusted it had
        // whatever shape the rest of the app assumed.
        const payload = decoded as JwtPayload;
        req.user = { id: payload.id, email: payload.email as string };
        next();
    });
}

module.exports = { authenticationToken };
