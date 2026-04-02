import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Router, Route, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Home from "@/pages/Home";
import Product from "@/pages/Product";

// Use hash-based routing (/#/) to support opening index.html directly via file:// protocol
// Tolerant routing: unmatched paths are treated as anchor sections (e.g., /#/services → scroll to #services)
// For in-page anchors, use <Link href="/section"> instead of <a href="#section">
function AppRouter() {
  return (
    <Router hook={useHashLocation}>
      <Switch>
        <Route path="/product/:key">{(params) => <Product keyParam={params.key} />}</Route>
        <Route path="/:section?">{(params) => <Home targetSection={params.section} />}</Route>
      </Switch>
    </Router>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <AppRouter />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
