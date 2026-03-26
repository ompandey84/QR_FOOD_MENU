import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MenuPage from './pages/MenuPage';
import LoginPage from './pages/LoginPage';
import DishForm from './pages/DishForm';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import OrdersPage from './pages/OrdersPage';
import MenuManagerPage from './pages/MenuManagerPage';
import ProtectedRoute from './components/ProtectedRoute';
import QRCodesPage from './pages/QRCodesPage';
import ReservationsPage from './pages/ReservationsPage';
import TablesPage from './pages/TablesPage';
import OffersPage from './pages/OffersPage';
import KitchenPage from './pages/KitchenPage';
import RunningBillPage from './pages/RunningBillPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public – Customer Facing Menu */}
        <Route path="/menu/:restaurantId" element={<MenuPage />} />

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
        <Route path="/qr-codes" element={<ProtectedRoute><QRCodesPage /></ProtectedRoute>} />
        <Route path="/reservations" element={<ProtectedRoute><ReservationsPage /></ProtectedRoute>} />
        <Route path="/tables" element={<ProtectedRoute><TablesPage /></ProtectedRoute>} />
        <Route path="/kitchen" element={<ProtectedRoute><KitchenPage /></ProtectedRoute>} />
        <Route path="/running-bill" element={<ProtectedRoute><RunningBillPage /></ProtectedRoute>} />

        {/* Default redirect */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

export default App;
