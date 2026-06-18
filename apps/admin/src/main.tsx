import "@workspace/ui/polyfills";
import {
  createHashHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import {
  TanStackQueryContext,
  TanStackQueryProvider,
} from "@workspace/ui/integrations/tanstack-query";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
// Import the generated route tree
import { routeTree } from "./routeTree.gen";
// Styles
import "@workspace/ui/globals.css";
import { DirectionProvider } from "@workspace/ui/integrations/direction";
import { LanguageProvider } from "@workspace/ui/integrations/language";
import { ThemeProvider } from "@workspace/ui/integrations/theme";
import { initializeI18n } from "@workspace/ui/lib/i18n";
import { fallbackLng, supportedLngs } from "./config/index.ts";
// Report web vitals
import reportWebVitals from "./reportWebVitals.ts";
// Common utilities
import { Logout } from "./utils/common.ts";

initializeI18n({
  supportedLngs,
  fallbackLng,
  ns: [
    "ads",
    "announcement",
    "auth-control",
    "auth",
    "components",
    "coupon",
    "dashboard",
    "document",
    "log",
    "marketing",
    "menu",
    "nodes",
    "order",
    "payment",
    "product",
    "servers",
    "subscribe",
    "system",
    "ticket",
    "tool",
    "translation",
    "user",
  ],
});

window.logout = Logout;

// Recover from stale chunk / dynamic import mismatch after deploy
const CHUNK_RELOAD_FLAG = "ppanel_admin_chunk_reload_once";
const shouldHandleChunkError = (msg?: string) =>
  !!msg &&
  (msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("Loading chunk"));

const reloadForChunkError = () => {
  const alreadyReloaded = sessionStorage.getItem(CHUNK_RELOAD_FLAG) === "1";
  if (alreadyReloaded) {
    sessionStorage.removeItem(CHUNK_RELOAD_FLAG);
  } else {
    sessionStorage.setItem(CHUNK_RELOAD_FLAG, "1");
    window.location.reload();
  }
};

window.addEventListener(
  "error",
  (event) => {
    const target = event.target as HTMLScriptElement | null;
    if (target?.tagName === "SCRIPT") {
      reloadForChunkError();
      return;
    }
    const message = (event as ErrorEvent).message;
    if (shouldHandleChunkError(message)) {
      reloadForChunkError();
    }
  },
  true
);

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason as { message?: string } | undefined;
  if (shouldHandleChunkError(reason?.message)) {
    reloadForChunkError();
  }
});

// Create a new router instance
const TanStackQueryProviderContext = TanStackQueryContext();
const hashHistory = createHashHistory();
const router = createRouter({
  routeTree,
  history: hashHistory,
  context: {
    ...TanStackQueryProviderContext,
  },
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Render the app
const rootElement = document.getElementById("app");
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <TanStackQueryProvider {...TanStackQueryProviderContext}>
        <LanguageProvider supportedLanguages={supportedLngs}>
          <ThemeProvider>
            <DirectionProvider>
              <RouterProvider router={router} />
            </DirectionProvider>
          </ThemeProvider>
        </LanguageProvider>
      </TanStackQueryProvider>
    </StrictMode>
  );
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
