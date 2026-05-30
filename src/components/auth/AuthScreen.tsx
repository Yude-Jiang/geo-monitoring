import { useState } from "react";
import { Loader2, Eye, EyeOff, Target } from "lucide-react";
import { useAuth } from "../AuthProvider";
import { useToast } from "../common/Toast";

export function AuthScreen() {
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    if (mode === "register" && !displayName.trim()) return;

    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password, displayName.trim());
      }
    } catch (err: any) {
      toast(err.message || "操作失败");
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode((m) => (m === "login" ? "register" : "login"));
    setUsername("");
    setPassword("");
    setDisplayName("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F7F9] p-4 font-sans">
      <div className="w-full max-w-sm mx-4">
        {/* Brand header */}
        <div className="w-14 h-14 bg-st-blue flex items-center justify-center text-white mx-auto mb-6 shadow-lg">
          <Target size={28} />
        </div>

        <div className="st-card p-8">
          <div className="text-center mb-8">
            <h1 className="text-xl font-black text-st-blue uppercase tracking-tight mb-1">
              GEO 战略中心
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {mode === "login" ? "登录" : "注册新账号"}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex bg-st-grey p-1 mb-6">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider transition-all ${
                mode === "login" ? "bg-white text-st-blue shadow-sm" : "text-gray-400"
              }`}
            >
              登录
            </button>
            <button
              onClick={() => setMode("register")}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider transition-all ${
                mode === "register" ? "bg-white text-st-blue shadow-sm" : "text-gray-400"
              }`}
            >
              注册
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
                用户名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 text-xs font-bold text-st-blue placeholder-gray-300 focus:outline-none focus:border-st-light-blue"
                placeholder="输入用户名"
                required
                autoFocus
              />
            </div>

            {mode === "register" && (
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
                  显示名
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 text-xs font-bold text-st-blue placeholder-gray-300 focus:outline-none focus:border-st-light-blue"
                  placeholder="如何称呼你"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
                密码
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 border border-gray-200 text-xs font-bold text-st-blue placeholder-gray-300 focus:outline-none focus:border-st-light-blue"
                  placeholder={mode === "register" ? "至少 4 位" : "输入密码"}
                  required
                  minLength={mode === "register" ? 4 : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full st-button-primary py-2.5 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {mode === "login" ? "登 录" : "注 册"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={switchMode}
              className="text-[10px] font-bold text-st-light-blue hover:text-st-blue transition-colors uppercase tracking-wider"
            >
              {mode === "login" ? "没有账号？注册" : "已有账号？登录"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
