import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/auction",
  withCredentials: true,
});

export async function endAuction(productId) {
  const res = await api.post(`/end/${productId}`);
  return res.data;
}
