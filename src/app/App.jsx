import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// ייבוא הדפים
import HomePage from "../pages/home/HomePage";
import LoginPage from "../pages/login/LoginPage";
import RegisterPage from "../pages/register/RegisterPage";
import ProfilePage from "../pages/profile/ProfilePage";
import ProductPage from "../pages/productPage/ProductPage"; 

import AddProductPage from "../pages/AddProductPage/AddProductPage";
import ManageProductsPage from "../pages/manageProducts/ManageProductsPage";
import MyBidsPage from "../pages/myBids/MyBidsPage";
import AdminDashboard from "../pages/AdminDashboard/AdminDashboard";
import SaleSummaryPage from "../pages/saleSummary/SaleSummaryPage";
import SearchResultsPage from "../pages/searchResults/SearchResultsPage";

import Navbar from "../components/navbar/Navbar";
import Footer from "../components/footer/Footer";

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <div className="App-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/product/:id" element={<ProductPage />} />
            <Route path="/add-product" element={<AddProductPage />} />
            <Route path="/manage-products" element={<ManageProductsPage />} />
            <Route path="/my-bids" element={<MyBidsPage />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/sale-summary" element={<SaleSummaryPage />} />
            <Route path="/search-results" element={<SearchResultsPage />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
