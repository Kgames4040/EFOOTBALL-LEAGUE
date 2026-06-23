import "@/App.css";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ConfirmProvider } from "@/components/ConfirmProvider";
import Login from "@/pages/Login";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import MyTeam from "@/pages/MyTeam";
import Teams from "@/pages/Teams";
import TeamDetail from "@/pages/TeamDetail";
import Admin from "@/pages/Admin";
import { Loader2 } from "lucide-react";

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="app-bg" />
      <Loader2 className="w-8 h-8 animate-spin text-neon-blue" />
    </div>
  );
}

function Protected({ children, adminOnly }) {
  const { user } = useAuth();
  if (user === null) return <Loading />;
  if (user === false) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/" replace />;
  return children;
}

function RootRoute() {
  const { user, team } = useAuth();
  if (user === null) return <Loading />;
  if (user === false) return <Navigate to="/login" replace />;
  if (user.role !== "admin" && !team) return <Navigate to="/onboarding" replace />;
  return <Dashboard />;
}

// On mobile, a hard page refresh should land the user on the home page.
function MobileReloadRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    try {
      const nav = performance.getEntriesByType("navigation")[0];
      const isReload = nav ? nav.type === "reload" : performance.navigation?.type === 1;
      const isMobile = window.innerWidth < 1024;
      if (isReload && isMobile && location.pathname !== "/" && location.pathname !== "/login") {
        navigate("/", { replace: true });
      }
    } catch (e) { /* no-op */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <ConfirmProvider>
            <MobileReloadRedirect />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/onboarding" element={<Protected><Onboarding /></Protected>} />
              <Route path="/" element={<RootRoute />} />
              <Route path="/my-team" element={<Protected><MyTeam /></Protected>} />
              <Route path="/teams" element={<Protected><Teams /></Protected>} />
              <Route path="/teams/:id" element={<Protected><TeamDetail /></Protected>} />
              <Route path="/admin" element={<Protected adminOnly><Admin /></Protected>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ConfirmProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
