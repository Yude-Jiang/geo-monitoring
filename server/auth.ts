import type { Request, Response, NextFunction } from "express";
import { createUser, verifyUser, createSession, getSession, deleteSessionByToken, getUserDisplayName } from "./db.ts";

export interface AuthRequest extends Request {
  user?: { id: string; displayName?: string };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "未登录" });
    return;
  }

  const token = header.slice(7);
  const session = getSession(token);
  if (!session) {
    res.status(401).json({ error: "会话已过期，请重新登录" });
    return;
  }

  req.user = { id: session.user_id, displayName: getUserDisplayName(session.user_id) || undefined };
  next();
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const token = header.slice(7);
    const session = getSession(token);
    if (session) {
      req.user = { id: session.user_id };
    }
  }
  next();
}

export function registerAuthRoutes(app: any): void {
  app.post("/api/auth/login", (req: AuthRequest, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "用户名和密码不能为空" });
    }

    const user = verifyUser(username, password);
    if (!user) {
      return res.status(401).json({ error: "用户名或密码错误" });
    }

    const session = createSession(user.id);
    res.json({
      token: session.token,
      user: { id: user.id, displayName: user.display_name },
    });
  });

  app.post("/api/auth/register", (req: AuthRequest, res: Response) => {
    const { username, password, displayName } = req.body;
    if (!username || !password || !displayName) {
      return res.status(400).json({ error: "用户名、密码和显示名不能为空" });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: "密码至少 4 位" });
    }

    try {
      const user = createUser(username, password, displayName);
      const session = createSession(user.id);
      res.json({
        token: session.token,
        user: { id: user.id, displayName: user.display_name },
      });
    } catch (err: any) {
      if (err.message?.includes("UNIQUE constraint")) {
        return res.status(409).json({ error: "用户名已存在" });
      }
      console.error("Register error:", err);
      res.status(500).json({ error: "注册失败" });
    }
  });

  app.get("/api/auth/me", requireAuth, (req: AuthRequest, res: Response) => {
    res.json({ user: req.user });
  });

  app.post("/api/auth/logout", (req: AuthRequest, res: Response) => {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      deleteSessionByToken(header.slice(7));
    }
    res.json({ success: true });
  });
}
