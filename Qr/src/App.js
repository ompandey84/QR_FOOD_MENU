import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MenuPage from './pages/MenuPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import LoginPage from './pages/LoginPage';
import DishForm from './pages/DishForm';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import OrdersPage from './pages/OrdersPage';
import MenuManagerPage from './pages/MenuManagerPage';
import ProtectedRoute from './components/ProtectedRoute';
import QRCodesPage from './pages/QRCodesPage';
import OffersPage from './pages/OffersPage';
import SponsoredPage from './pages/SponsoredPage';
import SubscriptionPage from './pages/SubscriptionPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public – Customer Facing Menu */}
        <Route path="/menu/:restaurantId" element={<MenuPage />} />
        <Route path="/menu/:restaurantId/cart" element={<CartPage />} />
        <Route path="/menu/:restaurantId/checkout" element={<CheckoutPage />} />

        {/* Admin */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
        <Route path="/add-dish" element={<ProtectedRoute><DishForm /></ProtectedRoute>} />
        <Route path="/edit-dish/:id" element={<ProtectedRoute><DishForm /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
        <Route path="/menu-manager" element={<ProtectedRoute><MenuManagerPage /></ProtectedRoute>} />
        <Route path="/offers" element={<ProtectedRoute><OffersPage /></ProtectedRoute>} />
        <Route path="/sponsored" element={<ProtectedRoute><SponsoredPage /></ProtectedRoute>} />
        <Route path="/qr-codes" element={<ProtectedRoute><QRCodesPage /></ProtectedRoute>} />
        <Route path="/subscription" element={<ProtectedRoute><SubscriptionPage /></ProtectedRoute>} />

        {/* Default redirect */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

export default App;
