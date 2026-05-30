import { useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "./components/AuthProvider";
import { useToast } from "./components/common/Toast";
import { useServerData } from "./hooks/useServerData";
import { useAnalytics } from "./hooks/useAnalytics";
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { PlaybackModal } from "./components/common/PlaybackModal";
import { ConfirmDialog } from "./components/common/ConfirmDialog";
import { DashboardPage } from "./pages/DashboardPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { ObservationsPage } from "./pages/ObservationsPage";
import { PromptsPage } from "./pages/PromptsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { CampaignPage } from "./pages/CampaignPage";
import { fetchCampaigns, type Campaign } from "./services/api";
import type { Observation } from "./types";
import { AuthScreen } from "./components/auth/AuthScreen";

export default function App() {
  const { user, loading: authLoading, login, logout } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedObs, setSelectedObs] = useState<Observation | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "observation" | "strategy";
    id: string;
  } | null>(null);

  const {
    observations,
    strategies,
    isRunningTask,
    setupAllPlatforms,
    lastSyncAt,
    saveStrategy,
    importCSV,
    deleteObservation,
    updateStrategy,
    deleteStrategy,
    runTask,
  } = useServerData(user);

  const analytics = useAnalytics(observations);

  // Delete confirmation handlers
  const handleRequestDeleteObs = useCallback(
    (id: string) => setDeleteTarget({ type: "observation", id }),
    []
  );
  const handleRequestDeleteStrategy = useCallback(
    (id: string) => setDeleteTarget({ type: "strategy", id }),
    []
  );
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "observation") {
        await deleteObservation(deleteTarget.id);
        toast("监测记录已删除", "success");
      } else {
        await deleteStrategy(deleteTarget.id);
        toast("监测策略已删除", "success");
      }
    } catch {
      toast("删除失败，请重试");
    }
    setDeleteTarget(null);
  }, [deleteTarget, deleteObservation, deleteStrategy, toast]);

  // ─── Auth Loading ──────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  // ─── Login Screen ──────────────────────────────────────────
  if (!user) {
    return <AuthScreen />;
  }

  // ─── Main App ──────────────────────────────────────────────
  const statsForDashboard = {
    visibilityRate: analytics.visibilityRate,
    topRecRate: analytics.topRecRate,
    propHitRate: analytics.propHitRate,
    avgSentiment: analytics.avgSentiment,
    acsScoreData: analytics.acsScoreData,
  };

  return (
    <div className="min-h-screen bg-[#F4F7F9] text-st-blue font-sans selection:bg-st-light-blue/30 st-grid-bg">
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === "dashboard") setSelectedCampaign(null);
        }}
        user={user}
        onLogout={logout}
      />

      <main className="lg:pl-64 pt-0">
        <Header
          activeTab={activeTab}
          isRunningTask={isRunningTask}
          onRunTask={() => runTask()}
          onSetupAll={setupAllPlatforms}
          lastSyncAt={lastSyncAt}
        />

        <div className="p-4 sm:p-6 lg:p-10">
          {activeTab === "dashboard" && !selectedCampaign && (
            <DashboardPage
              observations={observations}
              stats={statsForDashboard}
              trends={analytics.trends}
              visibilityTrendData={analytics.visibilityTrendData}
              platformPerformanceData={analytics.platformPerformanceData}
              onDeleteObservation={deleteObservation}
              onSelectObservation={setSelectedObs}
              onNavigateToObservations={() => setActiveTab("observations")}
              confirmingDeleteId={null}
              onRequestDelete={handleRequestDeleteObs}
              onSelectCampaign={setSelectedCampaign}
            />
          )}
          {activeTab === "dashboard" && selectedCampaign && (
            <CampaignPage
              campaign={selectedCampaign}
              onBack={() => setSelectedCampaign(null)}
              onUpdated={() => { /* trigger re-fetch */ }}
            />
          )}

          {activeTab === "observations" && (
            <ObservationsPage
              observations={observations}
              onDeleteObservation={deleteObservation}
              onSelectObservation={setSelectedObs}
              onRequestDelete={handleRequestDeleteObs}
            />
          )}

          {activeTab === "analytics" && (
            <AnalyticsPage observations={observations} />
          )}

          {activeTab === "prompts" && (
            <PromptsPage
              strategies={strategies}
              isRunningTask={isRunningTask}
              onRunTask={runTask}
              onSaveStrategy={(campaignId, prompt, intent, freq, plats) => saveStrategy(campaignId, prompt, intent, freq, plats)}
              onUpdateStrategy={updateStrategy}
              onDeleteStrategy={deleteStrategy}
              onRequestDelete={handleRequestDeleteStrategy}
              onImportCSV={importCSV}
            />
          )}

          {activeTab === "settings" && <SettingsPage />}
        </div>
      </main>

      {/* Playback Modal */}
      {selectedObs && (
        <PlaybackModal
          obs={selectedObs}
          onClose={() => setSelectedObs(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <ConfirmDialog
          title="确认删除"
          message={
            deleteTarget.type === "observation"
              ? "确定要删除这条监测记录吗？此操作不可撤销。"
              : "确定要删除这条监测策略吗？此操作不可撤销。"
          }
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
