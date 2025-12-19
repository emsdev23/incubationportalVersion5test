// src/utils/crypto.js

import CryptoJS from "crypto-js";

// The encryption key should be stored securely, e.g., in environment variables
// For this example, we'll keep it here as requested.
const ENCRYPTION_KEY = "aXRlbGluYzIwY3JwdG8zMmF1dGhzZXJ2aWNlMjVrZXk";

/**
 * Encrypts plaintext using AES-256-CBC.
 * @param {string} plainText - The JSON string to encrypt.
 * @returns {string} The encrypted payload in the format "ivBase64:ciphertextBase64".
 */
export const encryptAES = (plainText) => {
  try {
    const key = CryptoJS.enc.Base64.parse(ENCRYPTION_KEY);
    const iv = CryptoJS.lib.WordArray.random(16);

    const encrypted = CryptoJS.AES.encrypt(plainText, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const ivBase64 = CryptoJS.enc.Base64.stringify(iv);
    const encryptedBase64 = encrypted.toString();

    return `${ivBase64}:${encryptedBase64}`;
  } catch (error) {
    console.error("Encryption error:", error);
    // In a real app, you might want to handle this more gracefully
    throw new Error("Failed to encrypt data");
  }
};

/**
 * Decrypts a payload encrypted by the backend.
 * @param {string} encryptedData - The string in the format "ivBase64:ciphertextBase64".
 * @returns {string} The decrypted plaintext (JSON string).
 */
export const decryptAES = (encryptedData) => {
  try {
    const key = CryptoJS.enc.Base64.parse(ENCRYPTION_KEY);
    const [ivBase64, encryptedBase64] = encryptedData.split(":");

    const iv = CryptoJS.enc.Base64.parse(ivBase64);
    const encrypted = CryptoJS.enc.Base64.parse(encryptedBase64);

    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: encrypted,
    });

    const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);

    if (!decryptedText) {
      throw new Error("Decryption resulted in empty text.");
    }

    return decryptedText;
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt data");
  }
};
