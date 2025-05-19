import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import axios from "axios"; // 👈 חסר
import { useAuth } from "../auth/AuthContext"; // 👈 חשוב מאוד

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
import "./App.css";

// קומפוננטות
import ProtectedRoute from "../components/ProtectedRoute/ProtectedRoute";
import Navbar from "../components/navbar/Navbar";
import Footer from "../components/footer/Footer";
import DashboardRouter from "../components/DashboardRouter/DashboardRouter.jsx";

// לוחות ניהול
import BuyerDashboard from "../pages/home/BuyerDashboard";
import SellerDashboard from "../pages/home/SellerDashboard.jsx";
import AdminDashboard from "../pages/home/AdminDashboard";

function App() {
  const { setUser } = useAuth(); // 👈 שימוש בקונטקסט של משתמש

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
