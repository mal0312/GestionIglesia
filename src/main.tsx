import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { browserNewsPersistenceService } from "./persistence/browserNewsPersistenceService";

const newsPersistenceService = browserNewsPersistenceService();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App newsPersistenceService={newsPersistenceService} />
  </StrictMode>
);
