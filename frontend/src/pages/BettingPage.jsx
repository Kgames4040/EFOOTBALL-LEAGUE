import React from "react";
import { useNavigate } from "react-router-dom";
import BettingPanel from "../components/BettingPanel";

export default function BettingPage() {
  const navigate = useNavigate();
  return <BettingPanel onBack={() => navigate("/")} onNavigateMyCoupons={() => navigate("/my-coupons")} />;
}
