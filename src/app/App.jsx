import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import axios from "axios";
import { useAuth } from "../auth/AuthContext";

// דפים
import HomePage from "../pages/home/HomePage";
import LoginPage from "../pages/login/LoginPage";
import RegisterPage from "../pages/register/RegisterPage";
import ProfilePage from "../pages/profile/ProfilePage";
import ProductPage from "../pages/productPage/ProductPage";
import BecomeSeller from "../pages/becomeSeller/becomeSeller.jsx";
import AddProductPage from "../pages/AddProductPage/AddProductPage";
import ManageProductsPage from "../pages/manageProducts/ManageProductsPage";
import MyBidsPage from "../pages/myBids/MyBidsPage";
import SearchResultsPage from "../components/search/SearchResultsPage.jsx";
import InfoPage from "../pages/infoPage/InfoPage.jsx";
import ShippingForm from "../pages/ShippingForm/ShippingForm.jsx";
import PaymentSuccess from "../pages/payment-success/payment-success.jsx";
import PaymentCancel from "../pages/payment-cancel/payment-cancel.jsx";
import ForgotPasswordPage from "../pages/ForgotPassword/ForgotPasswordPage";
import ResetPasswordPage from "../pages/ResetPassword/ResetPasswordPage";
import AdminUsers from "../pages/AdminUsers/AdminUsers.jsx";
import AdminCategories from "../pages/AdminCategories/AdminCategories.jsx";
import AdminProductsPage from "../pages/AdminProductsPage/AdminProductsPage.jsx";
import AdminMessages from "../pages/AdminMessages/AdminMessages.jsx";
import AdminStatistics from "../pages/AdminStatistics/AdminStatistics.jsx";

// קומפוננטות
import ProtectedRoute from "../components/ProtectedRoute/ProtectedRoute";
import Navbar from "../components/navbar/Navbar";
import Footer from "../components/footer/Footer";
import DashboardRouter from "../components/DashboardRouter/DashboardRouter.jsx";
import LiveAuctionWrapper from "../components/LiveAuctionWrapper/LiveAuctionWrapper.jsx";
import AIChat from "../components/AIChat/AIChat.jsx";
import AdminProductDetails from "../components/AdminProductDetails/AdminProductDetails.jsx";
// לוחות ניהול
import BuyerDashboard from "../pages/home/BuyerDashboard";
import SellerDashboard from "../pages/home/SellerDashboard.jsx";
import AdminDashboard from "../pages/home/AdminDashboard";

import "./App.css";

function App() {



  return (
    <div className="App">
      <header>
        <Navbar />
      </header>
      <div className="App-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardRouter />} />
          <Route path="/buyer" element={<BuyerDashboard />} />
          <Route path="/seller" element={<SellerDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route
            path="/reset-password/:token"
            element={<ResetPasswordPage />}
          />
          <Route path="/info" element={<InfoPage />} />
<Route
  path="/profile"
  element={<ProtectedRoute element={<ProfilePage />} />}
/>
          <Route path="/product/:id" element={<ProductPage />} />
          {/* ... מסלולים של מנהל */}
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute element={<AdminDashboard />} roles={["admin"]} />
            }
          />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/categories" element={<AdminCategories />} />
          <Route path="/admin/products" element={<AdminProductsPage />} />
          <Route path="/admin/messages" element={<AdminMessages />} />
          <Route path="/admin/stats" element={<AdminStatistics />} />

          <Route
            path="/admin/products/:productId"
            element={<AdminProductDetails />}
          />
          {/* ... מסלולים נוספים */}
          <Route
            path="/add-product"
            element={<ProtectedRoute element={<AddProductPage />} />}
          />
          <Route path="/payment-success/:id" element={<PaymentSuccess />} />
          <Route path="/payment-cancel" element={<PaymentCancel />} />
          <Route path="/shipping/:id" element={<ShippingForm />} />
          <Route path="/live-auction/:id" element={<LiveAuctionWrapper />} />
          <Route path="/become-seller" element={<BecomeSeller />} />
          <Route path="/manage-products" element={<ManageProductsPage />} />
          <Route path="/my-bids" element={<MyBidsPage />} />
          <Route path="/search-results" element={<SearchResultsPage />} />
        </Routes>
      </div>

      <AIChat />

      <Footer />
    </div>
  );
}

export default App;
