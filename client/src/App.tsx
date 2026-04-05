import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Analytics } from "@vercel/analytics/react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Dossier from "@/pages/dossier";
import Profile from "@/pages/profile";
import PublicProfile from "@/pages/public-profile";
import Admin from "@/pages/admin";
import { UiExperimentsProvider } from "@/features/experiments/ui-experiments-context";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dossier" component={Dossier} />
      <Route path="/profile" component={Profile} />
      <Route path="/node/:id" component={PublicProfile} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UiExperimentsProvider>
        <TooltipProvider delayDuration={100}>
          <Toaster />
          <Router />
          <Analytics />
        </TooltipProvider>
      </UiExperimentsProvider>
    </QueryClientProvider>
  );
}

export default App;
