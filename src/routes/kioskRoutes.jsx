import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import KioskWelcome from '../screens/kiosk/KioskWelcome';
import KioskContractorSignIn from '../screens/kiosk/KioskContractorSignIn';
import KioskVisitorInduction from '../screens/kiosk/KioskVisitorInduction';
import KioskVisitorSignIn from '../screens/kiosk/KioskVisitorSignIn';
import KioskSignOut from '../screens/kiosk/KioskSignOut';
import KioskPermits from '../screens/kiosk/KioskPermits';

/**
 * Kiosk Routes - URL-based routing for kiosk screens
 * These routes handle the sign-in/sign-out flow for kiosk mode
 * 
 * Routes:
 * /                      - Welcome screen
 * /sign-in/contractor    - Contractor sign-in
 * /sign-in/visitor       - Visitor induction + sign-in
 * /sign-out              - Sign out screen
 * /permits               - Permits view (shown in floating button on all screens)
 */
export const KioskRoutes = () => {
  return (
    <Routes>
      {/* Default route - welcome screen */}
      <Route path="/" element={<KioskWelcome />} />
      
      {/* Sign-in routes */}
      <Route path="/sign-in/contractor" element={<KioskContractorSignIn />} />
      <Route path="/sign-in/visitor" element={<KioskVisitorInduction />} />
      
      {/* Sign-out route */}
      <Route path="/sign-out" element={<KioskSignOut />} />
      
      {/* Permits route */}
      <Route path="/permits" element={<KioskPermits />} />
      
      {/* Catch-all - redirect to welcome */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default KioskRoutes;
