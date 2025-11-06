import axios from "axios";
import Swal from "sweetalert2";
import { IPAdress } from "./IPAdrees";

const api = axios.create({
  baseURL: `${IPAdress}/itelinc/resources`,
});

// Request interceptor (attach token)
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor (handle errors globally)
// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401) {
//       // Unauthorized → Show SweetAlert
//       Swal.fire({
//         icon: "error",
//         title: "Session Expired",
//         text: error.response?.data?.message || "Please log in again.",
//         confirmButtonText: "OK",
//       }).then(() => {
//         sessionStorage.clear();
//         window.location.href = "/"; // Redirect only after OK clicked
//       });
//     } else if (error.response?.data?.message) {
//       // Other API errors → show message
//       Swal.fire({
//         // icon: "error",
//         // title: "Error",
//         text: error.response.data.message,
//         confirmButtonText: "OK",
//       });
//     }
//     return Promise.reject(error);
//   }
// );

export default api;
