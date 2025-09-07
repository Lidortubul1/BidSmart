//src\services\auctionApi.js
// auctionApi.js: שירות API למכרזים — כולל סיום מכירה (`endAuction`) ל־productId מסוים דרך קריאת POST לשרת.

import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/auction",
  withCredentials: true,
});

export async function endAuction(productId) {
  const res = await api.post(`/end/${productId}`);
  return res.data;
}
