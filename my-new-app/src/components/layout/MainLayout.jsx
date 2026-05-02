import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../Navbar";
import Footer from "./Footer";

/**
 * Main Layout component that wraps all main pages
 * Includes Navbar and Footer for pages that need them
 * Some pages (like AddRoom, MyPosts, etc.) have their own headers
 */
export default function MainLayout() {
  const location = useLocation();
  
  // Routes that should NOT show Navbar and Footer
  const routesWithoutLayout = [
    '/add-room',
    '/my-posts',
    '/saved-posts',
    '/profile/edit',
    '/pricing',
    '/verification'
  ];
  
  const shouldShowLayout = !routesWithoutLayout.some(route => 
    location.pathname.startsWith(route)
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      {shouldShowLayout && <Navbar />}
      <main className="flex-1">
        <Outlet />
      </main>
      {shouldShowLayout && <Footer />}
    </div>
  );
}
