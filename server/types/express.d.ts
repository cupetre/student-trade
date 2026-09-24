// Module augmentation: adds our custom fields to Express's Request type.
// Without this, `req.user = ...` in authConfig.ts (and reading it back in
// every controller) would be a type error, because Express's own Request
// type has no idea our auth middleware attaches a user. This file doesn't
// export anything at runtime — it only teaches the type checker about
// properties that exist because of what our own middleware does.
export {};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
      };
    }
  }
}
