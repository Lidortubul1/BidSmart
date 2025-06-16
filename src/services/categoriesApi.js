import axios from "axios";

axios.defaults.baseURL = "http://localhost:5000";
axios.defaults.withCredentials = true;


//טעינת הקטגוריות
export async function fetchCategories() {
  const response = await axios.get("/api/categories");
  return response.data;
}

