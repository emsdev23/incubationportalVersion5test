import React, { useEffect, useState } from "react";
import styles from "./Navbar.module.css";
import {
  UserRound,
  X,
  LogOut,
  CircleUserRound,
  FolderDown,
  MessageSquare,
  FileBadge,
} from "lucide-react";
import ITELLogo from "../assets/ITEL_Logo.png";
import MetricCardDashboard from "./MetricCardDashboard";
import CompanyFieldChart from "./CompanyFieldChart";
import FundingStageChart from "./FundingStageChart";
import DocumentTable from "./DocumentTable";
import { NavLink, useNavigate } from "react-router-dom";
import CompanyTable from "./CompanyTable";
import Swal from "sweetalert2";

import { useContext } from "react";
import { DataContext } from "../Components/Datafetching/DataProvider";
import DDIDocumentUploadModal from "./DDI/DDIDocumentUploadModal ";
import DDIDocumentsTable from "./DDI/DDIDocumentsTable";
import { IPAdress } from "./Datafetching/IPAdrees";
import IncubatorSelectorTable from "./IncubatorSelectorTable"; // Import the new component

const Navbar = () => {
  const {
    stats,
    byField,
    byStage,
    loading,
    companyDoc,
    listOfIncubatees,
    clearAllData,
    roleid, // Get roleid from context
    selectedIncubation, // Get selected incubation
  } = useContext(DataContext);
  const navigate = useNavigate();

  console.log(stats);
  console.log(byField);
  console.log(byStage);
  console.log(loading);
  console.log(companyDoc);
  console.log(listOfIncubatees);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    founder: "",
    incorporationDate: "",
    website: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  //form for add startUP
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("New Startup:", formData);
    // TODO: send data to backend
    setIsModalOpen(false);
    setFormData({ name: "", founder: "", incorporationDate: "", website: "" });
  };

  const handleLogout = async () => {
    // Step 1️⃣: Ask for confirmation
    const confirmResult = await Swal.fire({
      title: "Are you sure?",
      text: "You will be logged out of your account.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, logout",
      cancelButtonText: "Cancel",
    });

    // If user cancels, exit
    if (!confirmResult.isConfirmed) return;

    try {
      // Step 2️⃣: Show loading popup
      Swal.fire({
        title: "Logging out...",
        text: "Please wait while we log you out",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      // Get session data without JSON.parse for incuserid
      const userid = roleid === "0" ? "32" : sessionStorage.getItem("userid");
      const incUserId = sessionStorage.getItem("incuserid"); // Don't parse this
      const token = sessionStorage.getItem("token");

      console.log(selectedIncubation.incubationshortname);
      if (!userid || !token) {
        Swal.close();
        Swal.fire({
          icon: "warning",
          title: "Not Logged In",
          text: "User session missing or expired",
        });
        return;
      }

      const currentTime = new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      });

      // Step 3️⃣: Call logout API
      const response = await fetch(
        `${IPAdress}/itelinc/resources/auth/logout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userid,
            reason: `Manual Logout at ${currentTime}`,
          }),
        }
      );

      const data = await response.json();
      console.log("Logout response:", data);

      // Step 4️⃣: Handle response
      Swal.close();

      if (response.ok) {
        // Clear all context and session storage
        clearAllData();
        sessionStorage.removeItem("userid");
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("roleid");
        sessionStorage.removeItem("incuserid");

        navigate("/", { replace: true });
      } else {
        Swal.fire({
          icon: "error",
          title: "Logout Failed",
          text: data.message || "Something went wrong",
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
      Swal.close();
      Swal.fire({
        icon: "error",
        title: "Logout Failed",
        text: "Something went wrong while logging out.",
      });
    }
  };

  //get data form session storage
  const userid =
    roleid === "0"
      ? sessionStorage.getItem("userid")
      : JSON.parse(sessionStorage.getItem("userid"));
  const sessionRoleid = sessionStorage.getItem("roleid"); // Get roleid from sessionStorage
  const token = sessionStorage.getItem("token");
  console.log(userid, sessionRoleid, token);

  // Check if user has roleid 3 (Incubator Operator)
  const isOperator = Number(roleid) === 3 || Number(sessionRoleid) === 3;
  const isDueDeeligence = Number(roleid) === 7 || Number(sessionRoleid) === 7;
  const SuperAdmin = Number(roleid) === 0 || Number(sessionRoleid) === 0;

  const logedinProfile =
    roleid === "1"
      ? "Incubator"
      : roleid === "3"
      ? "Incubator Operator"
      : roleid === "7"
      ? "Due Deligence Inspector"
      : roleid === "4"
      ? "Incubatee"
      : "Admin";
  console.log(logedinProfile);

  // Function to get the logo URL
  const getLogoUrl = () => {
    if (selectedIncubation && selectedIncubation.incubationslogopath) {
      // If the path starts with http, use it directly
      if (selectedIncubation.incubationslogopath.startsWith("http")) {
        return selectedIncubation.incubationslogopath;
      }
      // Otherwise, prepend the base URL
      return `${IPAdress}${selectedIncubation.incubationslogopath}`;
    }
    // Return default logo if no selected incubation or no logo path
    return ITELLogo;
  };

  useEffect(() => {}, []);
  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.container}>
          {/* Left - Logo + Title */}
          <div className={styles.logoSection}>
            <img
              src={getLogoUrl()}
              className={styles.logoIcon}
              alt="Incubator Logo"
            />
            <div>
              <h1 className={styles.title}>
                {/* {selectedIncubation
                  ? `${selectedIncubation.incubationshortname} Portal`
                  : "ITEL Incubation Portal"} */}
                {selectedIncubation?.incubationshortname}
              </h1>
              <p className={styles.subtitle}>Startup Management Dashboard</p>
            </div>
          </div>

          {/* Right - Actions */}
          <div className={styles.actions}>
            {/* Chat button now available for all users */}
            {Number(roleid) === 0 && (
              <NavLink
                to="/Incubation/Dashboard/Incubation"
                style={{ textDecoration: "none" }}
              >
                <button className={styles.btnPrimary}>
                  <FileBadge className={styles.icon} />
                  Incubator Management
                </button>
              </NavLink>
            )}
            {Number(roleid) !== 7 && !SuperAdmin && (
              <NavLink
                to="/Incubation/Dashboard/Chats"
                style={{ textDecoration: "none" }}
              >
                <button className={styles.btnPrimary}>
                  <MessageSquare className={styles.icon} />
                  Chat
                </button>
              </NavLink>
            )}

            {/* Only show User Management button if roleid is not 3 */}
            {!isOperator && !isDueDeeligence && (
              <NavLink
                to="/Incubation/Dashboard/Usermanagement"
                style={{ textDecoration: "none" }}
              >
                <button className={styles.btnPrimary}>
                  <UserRound className={styles.icon} />
                  User Management
                </button>
              </NavLink>
            )}

            {/* Only show User Management button if roleid is not 3 */}
            {!isOperator && !isDueDeeligence && !SuperAdmin && (
              <NavLink
                to="/Incubation/Dashboard/Userassociation"
                style={{ textDecoration: "none" }}
              >
                <button className={styles.btnPrimary}>
                  <UserRound className={styles.icon} />
                  User Association
                </button>
              </NavLink>
            )}

            {/* Only show Document Management button if roleid is not 3 */}
            {!isOperator && !isDueDeeligence && !SuperAdmin && (
              <NavLink
                to="/Incubation/Dashboard/AddDocuments"
                style={{ textDecoration: "none" }}
              >
                <button className={styles.btnPrimary}>
                  <FolderDown className={styles.icon} />
                  Document Management
                </button>
              </NavLink>
            )}

            <button
              className={styles.btnPrimary}
              onClick={handleLogout}
              style={{ color: "#fff", background: "#fa5252" }}
            >
              <LogOut className={styles.icon} />
              Logout
            </button>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                fontSize: "0.8rem",
                color: "gray",
                cursor: "pointer",
              }}
              // onClick={() => setIsChangePasswordOpen(true)}
            >
              <CircleUserRound />
              <div>{logedinProfile}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        {roleid === "0" ? <IncubatorSelectorTable /> : ""}

        <br />
        {roleid === "7" ? "" : <MetricCardDashboard stats={stats} />}

        {roleid === "7" ? (
          ""
        ) : (
          <div className={styles.charts}>
            <CompanyFieldChart byField={byField} />
            <FundingStageChart byStage={byStage} />
          </div>
        )}

        {/* Incubator Selector and Table Component */}

        <CompanyTable companyList={listOfIncubatees} />
        <br />
        <DDIDocumentUploadModal />
        <br />
        <DocumentTable />
        <br />
        {roleid === "0" ? "" : <DDIDocumentsTable />}
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent}>
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <h2>Add New Company</h2>
              <button
                className={styles.closeButton}
                onClick={() => setIsModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Form */}

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGrid}>
                <label>
                  Company Name
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  Founder
                  <input
                    type="text"
                    name="founder"
                    value={formData.founder}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  Date of Incorporation
                  <input
                    type="date"
                    name="incorporationDate"
                    value={formData.incorporationDate}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  Mobile
                  <input
                    type="tel"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  Email
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  Website
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    required
                  />
                </label>

                {/* Address Fields */}
                <label>
                  Address Line 1
                  <input
                    type="text"
                    name="address1"
                    value={formData.address1}
                    onChange={handleChange}
                    placeholder="House no., Street, etc."
                  />
                </label>

                <label>
                  Address Line 2
                  <input
                    type="text"
                    name="address2"
                    value={formData.address2}
                    onChange={handleChange}
                    placeholder="Apartment, landmark (optional)"
                  />
                </label>

                <label>
                  City
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  State / Province
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  Country
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                  >
                    <option value="">Select your country</option>
                    <option value="india">India</option>
                    <option value="usa">United States</option>
                    <option value="uk">United Kingdom</option>
                    <option value="australia">Australia</option>
                  </select>
                </label>

                <label>
                  Pincode / Zip Code
                  <input
                    type="text"
                    name="zipcode"
                    value={formData.zipcode}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  Phone Number
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </label>

                {/* Example extra fields */}
                <label>
                  Industry
                  <input
                    type="text"
                    name="industry"
                    value={formData.industry}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  Number of Employees
                  <input
                    type="number"
                    name="employees"
                    value={formData.employees}
                    onChange={handleChange}
                  />
                </label>
              </div>

              {/* Footer buttons */}
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Navbar;
