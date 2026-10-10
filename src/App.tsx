import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { AppWorkspaceLayout } from './pages/AppWorkspaceLayout';
import { VerifyRoute, ReleasesRoute, RiskRoute, RegistryRoute } from './pages/workspaceRoutes';
import { NotFoundPage } from './pages/NotFoundPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Product Workspace */}
        <Route path="/app" element={<AppWorkspaceLayout />}>
          <Route index element={<Navigate to="/app/verify" replace />} />
          <Route path="verify" element={<VerifyRoute />} />
          <Route path="releases" element={<ReleasesRoute />} />
          <Route path="risk" element={<RiskRoute />} />
          <Route path="registry" element={<RegistryRoute />} />
        </Route>

        {/* Catch-all 404 Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
