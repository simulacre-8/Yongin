import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { DemoProvider } from "@/contexts/DemoContext";
import AppShell from "@/components/AppShell";
import Dashboard from "@/pages/Dashboard";
import Targets from "@/pages/Targets";
import Laws from "@/pages/Laws";
import Obligations from "@/pages/Obligations";
import Evidence from "@/pages/Evidence";
import Inspection from "@/pages/Inspection";
import Summary from "@/pages/Summary";
import Plan from "@/pages/Plan";
import NotFound from "@/pages/NotFound";

function Router() {
  return (
    <AppShell>
      <Switch>
        <Route path="/" component={Plan} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/targets" component={Targets} />
        <Route path="/laws" component={Laws} />
        <Route path="/obligations" component={Obligations} />
        <Route path="/evidence" component={Evidence} />
        <Route path="/inspection" component={Inspection} />
        <Route path="/summary" component={Summary} />
        <Route path="/plan" component={Plan} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <DemoProvider>
            <Toaster position="top-center" richColors />
            <Router />
          </DemoProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
