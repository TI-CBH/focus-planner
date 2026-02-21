import { useState, useEffect, useCallback } from "react";
import pb from "@/lib/pocketbase";
import AuthPage from "@/pages/AuthPage";
import PlannerPage from "@/pages/PlannerPage";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(pb.authStore.isValid);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  useEffect(() => {
    async function checkAuth() {
      if (pb.authStore.isValid) {
        try {
          await pb.collection("users").authRefresh();
          setIsAuthenticated(true);
        } catch {
          pb.authStore.clear();
          setIsAuthenticated(false);
        }
      }
      setIsLoading(false);
    }
    checkAuth();

    const unsub = pb.authStore.onChange(() => {
      setIsAuthenticated(pb.authStore.isValid);
    });
    return () => unsub();
  }, []);

  const handleLogout = useCallback(() => {
    pb.authStore.clear();
    setIsAuthenticated(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? (
    <PlannerPage onLogout={handleLogout} />
  ) : (
    <AuthPage onAuth={() => setIsAuthenticated(true)} />
  );
}

export default App;
