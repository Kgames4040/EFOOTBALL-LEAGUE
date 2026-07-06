import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth, isStaff } from "@/context/AuthContext";
import { ConfirmProvider } from "@/components/ConfirmProvider";
import Login from "@/pages/Login";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import MyTeam from "@/pages/MyTeam";
import Teams from "@/pages/Teams";
import TeamDetail from "@/pages/TeamDetail";
import Admin from "@/pages/Admin";
import MatchTracking from "@/pages/MatchTracking";
import MagazineDetail from "@/pages/MagazineDetail";
import { useBackendKeepalive } from "@/lib/keepalive";
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
  if (adminOnly && !isStaff(user.role)) return <Navigate to="/" replace />;
  return children;
}

function RootRoute() {
  const { user, team } = useAuth();
  if (user === null) return <Loading />;
  if (user === false) return <Navigate to="/login" replace />;
  if (!isStaff(user.role) && !team) return <Navigate to="/onboarding" replace />;
  return <Dashboard />;
}

// On mobile, a hard page refresh keeps the user on the current screen.
function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <ConfirmProvider>
            <KeepaliveHost />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/onboarding" element={<Protected><Onboarding /></Protected>} />
              <Route path="/" element={<RootRoute />} />
              <Route path="/my-team" element={<Protected><MyTeam /></Protected>} />
              <Route path="/teams" element={<Protected><Teams /></Protected>} />
              <Route path="/teams/:id" element={<Protected><TeamDetail /></Protected>} />
              <Route path="/match/:id" element={<Protected><MatchTracking /></Protected>} />
              <Route path="/magazine/:id" element={<Protected><MagazineDetail /></Protected>} />
              <Route path="/admin" element={<Protected adminOnly><Admin /></Protected>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ConfirmProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

function KeepaliveHost() {
  useBackendKeepalive();
  return null;
}

export default App;
