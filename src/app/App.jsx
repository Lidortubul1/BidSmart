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
import SaleSummaryPage from "../pages/saleSummary/SaleSummaryPage";
import SearchResultsPage from "../components/search/SearchResultsPage.jsx";
import InfoPage from "../pages/infoPage/InfoPage.jsx";
import DeliveryChoice from "../pages/DeliveryChoice/DeliveryChoice.jsx";
import ShippingForm from "../pages/ShippingForm/ShippingForm.jsx";
import PickupInfo from "../pages/PickupInfo/PickupInfo.jsx";
import PaymentSuccess from "../pages/payment-success/payment-success.jsx";
import PaymentCancel from "../pages/payment-cancel/payment-cancel.jsx";
import OrderSummaryPage from "../pages/OrderSummary/OrderSummaryPage";
import ForgotPasswordPage from "../pages/ForgotPassword/ForgotPasswordPage";
import ResetPasswordPage from "../pages/ResetPassword/ResetPasswordPage";

// קומפוננטות
import ProtectedRoute from "../components/ProtectedRoute/ProtectedRoute";
import Navbar from "../components/navbar/Navbar";
import Footer from "../components/footer/Footer";
import DashboardRouter from "../components/DashboardRouter/DashboardRouter.jsx";
import LiveAuctionWrapper from "../components/LiveAuctionWrapper/LiveAuctionWrapper.jsx";

// לוחות ניהול
import BuyerDashboard from "../pages/home/BuyerDashboard";
import SellerDashboard from "../pages/home/SellerDashboard.jsx";
import AdminDashboard from "../pages/home/AdminDashboard";

import "./App.css";

function App() {
  const { setUser } = useAuth();

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/auth/session", { withCredentials: true })
      .then((res) => {
        if (res.data.loggedIn) {
          setUser(res.data.user);
        }
      })
      .catch((err) => console.error("שגיאה בשליפת session:", err));
  }, [setUser]);

  return (
    <div className="App">
      <Navbar />
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
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute element={<AdminDashboard />} roles={["admin"]} />
            }
          />
          <Route
            path="/add-product"
            element={<ProtectedRoute element={<AddProductPage />} />}
          />
          <Route path="/payment-success/:id" element={<PaymentSuccess />} />
          <Route path="/payment-cancel" element={<PaymentCancel />} />
          <Route
            path="/delivery-choice/:productId"
            element={<DeliveryChoice />}
          />
          <Route path="/shipping/:id" element={<ShippingForm />} />
          <Route path="/pickup-info/:id" element={<PickupInfo />} />
          <Route path="/live-auction/:id" element={<LiveAuctionWrapper />} />
          <Route
            path="/order-summary/:productId"
            element={<OrderSummaryPage />}
          />
          <Route path="/become-seller" element={<BecomeSeller />} />
          <Route path="/manage-products" element={<ManageProductsPage />} />
          <Route path="/my-bids" element={<MyBidsPage />} />
          <Route path="/sale-summary" element={<SaleSummaryPage />} />
          <Route path="/search-results" element={<SearchResultsPage />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}

export default App;
