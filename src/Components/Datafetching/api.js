import axios from "axios";
import Swal from "sweetalert2";
import { IPAdress } from "./IPAdrees";

const api = axios.create({
  baseURL: `${IPAdress}/itelinc/resources`,
});

// Request interceptor (attach token)
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");
  const userid = sessionStorage.getItem("userid");
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  if (userid) {
    config.headers["userid"] = userid;
  }

  // Override for specific endpoints
  if (config.url?.includes("/logout")) {
    config.headers["X-Module"] = "log_out";
    config.headers["X-Action"] = "user Logout attempt";
  }

  if (config.url?.includes("/getstatscom")) {
    config.headers["X-Module"] = "Statistics Data";
    config.headers["X-Action"] = "Fetching Incubatees Statistics data ";
  }
  if (config.url?.includes("/getcombyfield")) {
    config.headers["X-Module"] = "Chart Data";
    config.headers["X-Action"] = "Fetching data by Feild of work";
  }

  if (config.url?.includes("/getcombystage")) {
    config.headers["X-Module"] = "Chart Data";
    config.headers["X-Action"] = "Fetching data by company Stage";
  }
  if (config.url?.includes("/getcollecteddocsdash")) {
    config.headers["X-Module"] = "List of Documents";
    config.headers["X-Action"] = "Fetching List of Collected Documents";
  }

  if (config.url?.includes("/getincubatessdash")) {
    config.headers["X-Module"] = "List of Incubatees";
    config.headers["X-Action"] = "Fetching List of  Incubatees";
  }

  //startup/incubatee module
  if (config.url?.includes("/changepassword")) {
    config.headers["X-Module"] = "Change Password";
    config.headers["X-Action"] = "Changing User Password";
  }
  if (config.url?.includes("/getspocs")) {
    config.headers["X-Module"] = "SPOCS";
    config.headers["X-Action"] = "Fetching Incubatee SPOCS Details";
  }

  //chat module
  if (config.url?.includes("/getfileurl")) {
    config.headers["X-Module"] = "Chat Module";
    config.headers["X-Action"] = "Fetching document preview URL";
  }
  if (config.url?.includes("/chat/close`")) {
    config.headers["X-Module"] = "Chat Module";
    config.headers["X-Action"] = "chat close attempt";
  }
  if (config.url?.includes("/getchatlist")) {
    config.headers["X-Module"] = "Chat Module";
    config.headers["X-Action"] = "Fetching chat list";
  }
  if (config.url?.includes("/initiate")) {
    config.headers["X-Module"] = "Chat Module";
    config.headers["X-Action"] = "Creating new chat";
  }
  if (config.url?.includes("/getchatdetails")) {
    config.headers["X-Module"] = "Chat Module";
    config.headers["X-Action"] = "Fetching chat details";
  }
  if (config.url?.includes("/chat/send")) {
    config.headers["X-Module"] = "Chat Module";
    config.headers["X-Action"] = "Sending message in chat";
  }

  return config;
});

// NEW: Response interceptor to handle authentication errors
api.interceptors.response.use(
  (response) => response, // Pass through successful responses
  (error) => {
    // Check if the error is due to an invalid JWT signature (401)
    if (
      error.response?.status === 401 &&
      (error.response?.data?.message?.includes("Invalid JWT signature") ||
        error.response?.data?.message?.includes("Token expired") ||
        error.response?.data?.message?.includes("Authentication error") ||
        error.response?.data?.message?.includes("JWT expired"))
    ) {
      // Clear user session
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("userid");
      sessionStorage.removeItem("roleid");
      sessionStorage.removeItem("incuserid");

      // // Show a notification to the user
      // Swal.fire({
      //   icon: "warning",
      //   title: "Session Expired",
      //   text: "Your session has expired. Please log in again.",
      //   confirmButtonText: "OK",
      //   timer: 3000,
      //   timerProgressBar: true,
      // }).then(() => {
      //   // Redirect to login page
      //   window.location.href = "/";
      // });

      // Also redirect immediately in case the user doesn't click the button
      // setTimeout(() => {
      //   window.location.href = "/";
      // }, 3500);

      // Redirect to login page
      window.location.href = "/";
    }

    // For other errors, just reject the promise
    return Promise.reject(error);
  }
);

export default api;
