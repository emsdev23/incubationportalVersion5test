// src/Datafetching/api.js

import axios from "axios";
import Swal from "sweetalert2";
import { IPAdress } from "./IPAdrees";
// Import the encryption and decryption functions
import { encryptAES, decryptAES } from "./crypto";

const api = axios.create({
  baseURL: `${IPAdress}/itelinc/resources`,
});

// --- Request Interceptor ---
// This interceptor now handles both encryption and adding headers
api.interceptors.request.use(
  (config) => {
    // 1. ENCRYPTION LOGIC
    // Check if the request has data (body) or params to encrypt
    if (config.data || config.params) {
      // Combine body and params into a single object for encryption
      const payload = {
        ...config.data,
        ...config.params,
      };

      // Encrypt the combined payload into a string
      const encryptedPayload = encryptAES(JSON.stringify(payload));

      // Set the request body to the new encrypted format
      config.data = { payload: encryptedPayload };

      // IMPORTANT: Clear the params, as they are now in the encrypted body
      config.params = {};
    }

    // 2. HEADER LOGIC (Your existing code)
    // This logic runs after encryption and adds the necessary headers
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
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- Response Interceptor ---
// This interceptor now handles both decryption and authentication errors
api.interceptors.response.use(
  // 1. SUCCESS RESPONSE LOGIC
  (response) => {
    // Check if the response data contains an encrypted payload
    if (response.data && response.data.payload) {
      try {
        // Decrypt the payload
        const decryptedJsonString = decryptAES(response.data.payload);

        // Parse the decrypted string back to an object
        // and replace the original response data
        response.data = JSON.parse(decryptedJsonString);
      } catch (error) {
        console.error("Failed to decrypt response:", error);
        // If decryption fails, it might be a non-encrypted response.
        // We'll just pass it through as is.
      }
    }
    // Return the (potentially modified) response
    return response;
  },
  // 2. ERROR RESPONSE LOGIC
  (error) => {
    // First, handle authentication errors (your existing logic)
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

      window.location.href = "/";
      return; // Stop further processing
    }

    // Second, try to decrypt error messages from the server
    if (error.response?.data?.payload) {
      try {
        const decryptedErrorString = decryptAES(error.response.data.payload);
        error.response.data = JSON.parse(decryptedErrorString);
      } catch (decryptionError) {
        // If error payload can't be decrypted, keep the original error
        console.error("Failed to decrypt error payload:", decryptionError);
      }
    }

    // For all other errors, reject the promise
    return Promise.reject(error);
  }
);

export default api;
