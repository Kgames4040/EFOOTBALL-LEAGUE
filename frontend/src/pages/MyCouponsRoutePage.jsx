import React from "react";
import { useNavigate } from "react-router-dom";
import MyCouponsPage from "../components/MyCouponsPage";

export default function MyCouponsRoutePage() {
  const navigate = useNavigate();
  return <MyCouponsPage onBack={() => navigate("/betting")} />;
}
