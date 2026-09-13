import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Router, Route, Switch, Redirect } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { MotionConfig } from "framer-motion";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import TracePage from "@/pages/TracePage";
import InhabitDevicePage from "@/pages/InhabitDevicePage";
import { PRODUCT_ROUTES } from "@/lib/products";

// Hash routing: only Trace/Inhabit product page is exposed; all other paths redirect here.
function AppRouter() {
  return (
    <Router hook={useHashLocation}>
      <Switch>
        <Route path={PRODUCT_ROUTES.trace}>
          <TracePage />
        </Route>
        <Route path={PRODUCT_ROUTES.device}>
          <InhabitDevicePage />
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
        {/* a11y-001: 跟随系统「减少动态效果」偏好。
            "user" 会自动禁用 transform / layout 动画（位移、缩放），
            但保留 opacity 淡入 —— 淡入不会引发前庭不适。
            一处配置即覆盖全部 section 的入场动画，无需逐个改调用点。 */}
        <MotionConfig reducedMotion="user">
          <TooltipProvider>
            <Toaster />
            <AppRouter />
          </TooltipProvider>
        </MotionConfig>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
