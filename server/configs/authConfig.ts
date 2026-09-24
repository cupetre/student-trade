import type { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

function authenticationToken(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err || !decoded) {
            return res.status(403).json({ error: 'Invalid token' });
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
