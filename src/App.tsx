import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Router, Route, Switch, Redirect } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Product from "@/pages/Product";

// Hash routing: only Trace/Inhabit product page is exposed; all other paths redirect here.
function AppRouter() {
  return (
    <Router hook={useHashLocation}>
      <Switch>
        <Route path="/product/trace">
          <Product keyParam="trace" />
        </Route>
        <Route path="/product/:key">
          <Redirect to="/product/trace" replace />
        </Route>
        <Route path="/">
          <Redirect to="/product/trace" replace />
        </Route>
        <Route path="/products">
          <Redirect to="/product/trace" replace />
        </Route>
        <Route path="/vision">
          <Redirect to="/product/trace" replace />
        </Route>
        <Route path="/intro">
          <Redirect to="/product/trace" replace />
        </Route>
        <Route path="/principles">
          <Redirect to="/product/trace" replace />
        </Route>
        <Route path="/:rest*">
          <Redirect to="/product/trace" replace />
        </Route>
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
