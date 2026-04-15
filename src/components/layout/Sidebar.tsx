import React, { useState } from "react";
import {
  LayoutDashboard,
  History,
  BarChart3,
  Search,
  Settings,
  LogOut,
  Target,
  Menu,
  X,
} from "lucide-react";
import type { User } from "firebase/auth";
import { cn } from "@/src/lib/utils";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  user: User;
  onLogout: () => void;
}

function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "st-sidebar-item w-full",
        active
          ? "st-sidebar-item-active"
          : "text-white/50 hover:bg-white/5 hover:text-white"
      )}
    >
      <span className={cn(active ? "text-st-yellow" : "text-white/30")}>
        {icon}
      </span>
      <span className="uppercase tracking-[0.15em] font-black text-[11px]">
        {label}
      </span>
    </button>
  );
}

export function Sidebar({ activeTab, onTabChange, user, onLogout }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (tab: string) => {
    onTabChange(tab);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-[60] lg:hidden bg-st-blue text-white p-2 shadow-xl"
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[55] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-64 bg-st-blue border-r border-st-dark z-50 text-white shadow-2xl transition-transform duration-300",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 text-white/60 hover:text-white lg:hidden"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>

        <div className="p-8 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-st-yellow rounded-none flex items-center justify-center text-st-blue shadow-inner">
              <Target size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-black text-xl tracking-tighter leading-none text-white">
                ST GEO
              </h1>
              <p className="text-[10px] text-st-yellow font-bold uppercase tracking-[0.2em] mt-1">
                Monitoring
              </p>
            </div>
          </div>
        </div>

        <nav className="py-6 space-y-1">
          <NavItem
            icon={<LayoutDashboard size={18} />}
            label="仪表盘"
            active={activeTab === "dashboard"}
            onClick={() => handleNav("dashboard")}
          />
          <NavItem
            icon={<History size={18} />}
            label="监测记录"
            active={activeTab === "observations"}
            onClick={() => handleNav("observations")}
          />
          <NavItem
            icon={<BarChart3 size={18} />}
            label="深度分析"
            active={activeTab === "analytics"}
            onClick={() => handleNav("analytics")}
          />
          <div className="pt-8 pb-2 px-8">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">
              配置管理
            </p>
          </div>
          <NavItem
            icon={<Search size={18} />}
            label="Prompt 矩阵"
            active={activeTab === "prompts"}
            onClick={() => handleNav("prompts")}
          />
          <NavItem
            icon={<Settings size={18} />}
            label="系统设置"
            active={activeTab === "settings"}
            onClick={() => handleNav("settings")}
          />
        </nav>

        <div className="absolute bottom-0 left-0 w-full p-6 border-t border-white/10 bg-st-dark/50">
          <div
            className="flex items-center gap-3 p-2 rounded-none hover:bg-white/5 cursor-pointer transition-colors group"
            onClick={onLogout}
          >
            <div className="w-10 h-10 rounded-none bg-st-yellow flex items-center justify-center text-st-blue font-black text-sm overflow-hidden shadow-lg shadow-st-yellow/20">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Avatar" />
              ) : (
                user.displayName?.charAt(0)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{user.displayName}</p>
              <p className="text-[10px] text-st-yellow font-bold uppercase tracking-wider">
                退出登录
              </p>
            </div>
            <LogOut
              size={14}
              className="text-white/40 group-hover:text-st-red transition-colors"
            />
          </div>
        </div>
      </aside>
    </>
  );
}
