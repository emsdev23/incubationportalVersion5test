import React, { createContext, useState, useEffect } from "react";
import api from "./api";

export const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [stats, setStats] = useState(null);
  const [byField, setByField] = useState([]);
  const [byStage, setByStage] = useState([]);
  const [companyDoc, setCompanyDoc] = useState([]);
  const [listOfIncubatees, setListOfIncubatees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [startupcompanyDoc, setstartupcompanyDoc] = useState([]);
  const [startupdetails, setstartupdetails] = useState([]);
  const [currentCompanyDetails, setCurrentCompanyDetails] = useState(null);

  // Add new state for admin viewing specific startup
  const [adminViewingStartupId, setAdminViewingStartupId] = useState(null);
  const [adminStartupLoading, setAdminStartupLoading] = useState(false);

  // Initialize state from sessionStorage
  const [userid, setUseridState] = useState(
    sessionStorage.getItem("userid") || null
  );

  const [roleid, setroleidState] = useState(
    sessionStorage.getItem("roleid") || null
  );

  const [incuserid, setincuseridstate] = useState(
    sessionStorage.getItem("incuserid") || null
  );

  // NEW: State for incubation list and selected incubation
  const [incubationList, setIncubationList] = useState([]);
  const [selectedIncubation, setSelectedIncubation] = useState(null);
  const [incubationDetails, setIncubationDetails] = useState(null);
  const [incubationLoading, setIncubationLoading] = useState(false);

  // Create proper setters that update sessionStorage
  const setUserid = (id) => {
    const idString = id ? String(id) : null;
    sessionStorage.setItem("userid", idString);
    setUseridState(idString);
  };

  const setroleid = (id) => {
    const idString = id ? String(id) : null;
    sessionStorage.setItem("roleid", idString);
    setroleidState(idString);
  };

  const setincuserid = (id) => {
    const idString = roleid === "1" ? "ALL" : id ? String(id) : null;
    sessionStorage.setItem("incuserid", idString);
    setincuseridstate(idString);
  };

  // State for date range filtering

  const [fromYear, setFromYear] = useState("2025-04-01");
  const [toYear, setToYear] = useState("2026-03-01");
  const [dateFilterLoading, setDateFilterLoading] = useState(false);

  // Helper function to safely extract data from API response
  const extractData = (response, fallback = []) => {
    if (!response) {
      console.warn("Response is undefined or null");
      return fallback;
    }
    if (response.data) {
      if (Array.isArray(response.data)) {
        return response.data;
      }
      if (response.data.data) {
        return response.data.data;
      }
      if (response.data.result) {
        return response.data.result;
      }
    }
    console.warn("Unexpected response structure:", response);
    return fallback;
  };

  // Format date for API (YYYY-MM-DD)
  const formatDateForAPI = (date) => {
    if (!date) return "";
    return new Date(date).toISOString().split("T")[0];
  };

  // NEW: Function to fetch documents by date range
  // NEW: Function to fetch documents by date range
  const fetchDocumentsByDateRange = async (startDate, endDate) => {
    setDateFilterLoading(true);
    try {
      // Determine the correct userId to use for the API call
      let targetUserId;
      if (Number(roleid) === 1) {
        // If admin is viewing a specific company, use that company's ID.
        // Otherwise, use "ALL" for the main admin dashboard.
        targetUserId = adminViewingStartupId || "ALL";
      } else {
        // For non-admin users, use their own ID.
        targetUserId = userid;
      }

      const response = await api.post("/generic/getcollecteddocsdash", {
        userId: targetUserId,
        incUserId: incuserid,
        startDate: startDate ? formatDateForAPI(startDate) : null,
        endDate: endDate ? formatDateForAPI(endDate) : null,
      });

      const data = extractData(response, []);

      // Determine which state to update with the fetched data
      if (Number(roleid) === 1 && adminViewingStartupId) {
        // Admin is viewing a specific company, so update the specific company's documents.
        setstartupcompanyDoc(data);
      } else {
        // This is for the main dashboard view (for admins or other roles).
        setCompanyDoc(data);
        // Also update startupcompanyDoc for non-admins, as they only see their own data.
        if (Number(roleid) !== 1) {
          setstartupcompanyDoc(data);
        }
      }

      return data;
    } catch (err) {
      console.error("Error fetching documents by date range:", err);

      // Clear the relevant state on error
      if (Number(roleid) === 1 && adminViewingStartupId) {
        setstartupcompanyDoc([]);
      } else {
        setCompanyDoc([]);
        if (Number(roleid) !== 1) {
          setstartupcompanyDoc([]);
        }
      }

      alert(
        `Error fetching documents: ${err.message || "Unknown error occurred"}`
      );
    } finally {
      setDateFilterLoading(false);
    }
  };

  // NEW: Function to fetch incubation list
  const fetchIncubationList = async () => {
    try {
      const response = await api.post("/generic/getincubationlist", {
        userId: userid,
        userIncId: "ALL",
      });
      const data = extractData(response, []);
      setIncubationList(data);
      if (incuserid && incuserid !== "ALL") {
        const defaultIncubation = data.find(
          (item) => item.incubationsrecid === parseInt(incuserid)
        );
        if (defaultIncubation) {
          setSelectedIncubation(defaultIncubation);
        }
      }
      return data;
    } catch (error) {
      console.error("Error fetching incubation list:", error);
      return [];
    }
  };

  // NEW: Function to fetch incubation details by ID
  const fetchIncubationDetails = async (incubationId) => {
    if (!incubationId) return null;
    setIncubationLoading(true);
    try {
      const response = await api.post("/generic/getincubationdetails", {
        userId: userid,
        userIncId: incubationId,
      });
      const data = extractData(response, []);
      const details = data.find(
        (item) => item.incubationsrecid === parseInt(incubationId)
      );
      setIncubationDetails(details);
      return details;
    } catch (error) {
      console.error("Error fetching incubation details:", error);
      return null;
    } finally {
      setIncubationLoading(false);
    }
  };

  // NEW: Function to handle incubation selection
  const handleIncubationSelect = async (incubation) => {
    setSelectedIncubation(incubation);
    setincuserid(incubation.incubationsrecid.toString());
    await fetchIncubationDetails(incubation.incubationsrecid);
  };

  // NEW: Function to reset incubation selection
  const resetIncubationSelection = () => {
    setSelectedIncubation(null);
    setIncubationDetails(null);
    if (roleid === "1") {
      setincuserid("ALL");
    } else {
      setincuserid(null);
    }
  };

  const refreshCompanyDocuments = async () => {
    try {
      const targetUserId = adminViewingStartupId || userid;
      const response = await api.post("/generic/getcollecteddocsdash", {
        userId:
          Number(roleid) === 1 && !adminViewingStartupId ? "ALL" : targetUserId,
        incUserId: incuserid,
        startDate: fromYear,
        endDate: toYear,
      });
      const data = extractData(response, []);
      setCompanyDoc(data);
      setstartupcompanyDoc(data);
      return data;
    } catch (error) {
      console.error("Error refreshing company documents:", error);
      throw error;
    }
  };

  const [adminviewData, setadminviewData] = useState(null);

  const fetchStartupDataById = async (userId) => {
    if (!userId) return;
    setAdminStartupLoading(true);
    setAdminViewingStartupId(userId);
    try {
      const documentsResponse = await api.post(
        "/generic/getcollecteddocsdash",
        {
          userId: userId,
          startDate: fromYear,
          endDate: toYear,
          incUserId: incuserid,
        }
      );
      const incubateesResponse = await api.post("/generic/getincubatessdash", {
        userId: userId,
        incUserId: incuserid,
      });
      const documentsData = extractData(documentsResponse, []);
      setstartupcompanyDoc(documentsData);
      const incubateesData = extractData(incubateesResponse, []);
      setstartupdetails(incubateesData);
    } catch (error) {
      console.error("Error fetching startup data by ID:", error);
      setstartupcompanyDoc([]);
      setstartupdetails([]);
    } finally {
      setAdminStartupLoading(false);
    }
  };

  useEffect(() => {
    if (adminviewData) {
      fetchStartupDataById(adminviewData);
    }
  }, [adminviewData, fromYear, toYear]);

  const fetchStartupDataForAdmin = async (startupUserId) => {
    if (Number(roleid) !== 1) {
      console.warn("Only admin can view other startup data");
      return;
    }
    fetchStartupDataById(startupUserId);
  };

  const resetAdminView = () => {
    setAdminViewingStartupId(null);
    setadminviewData(null);
    setstartupcompanyDoc([]);
    setstartupdetails([]);
  };

  const clearAllData = () => {
    setStats(null);
    setByField([]);
    setByStage([]);
    setCompanyDoc([]);
    setListOfIncubatees([]);
    setstartupcompanyDoc([]);
    setstartupdetails([]);
    setCurrentCompanyDetails(null);
    setAdminViewingStartupId(null);
    setadminviewData(null);
    setLoading(false);
  };

  useEffect(() => {
    if (!userid || !roleid) {
      clearAllData();
      return;
    }
    if (Number(roleid) === 4 && (adminViewingStartupId || adminviewData)) {
      resetAdminView();
    }
  }, [userid, roleid, incuserid]);

  useEffect(() => {
    const handleStorageChange = () => {
      const sessionUserid = sessionStorage.getItem("userid");
      const sessionRoleid = sessionStorage.getItem("roleid");
      const sessionIncuserid = sessionStorage.getItem("incuserid");
      if (sessionUserid !== userid) setUseridState(sessionUserid);
      if (sessionRoleid !== roleid) setroleidState(sessionRoleid);
      if (sessionRoleid === "1") {
        if (incuserid !== "ALL") setincuseridstate("ALL");
      } else {
        if (sessionIncuserid !== incuserid) setincuseridstate(sessionIncuserid);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    handleStorageChange();
    const intervalId = setInterval(handleStorageChange, 500);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(intervalId);
    };
  }, [userid, roleid, incuserid]);

  useEffect(() => {
    if (userid) {
      fetchIncubationList();
    }
  }, [userid]);

  useEffect(() => {
    if (selectedIncubation) {
      fetchIncubationDetails(selectedIncubation.incubationsrecid);
    }
  }, [selectedIncubation]);

  // General data fetch (for admin/users)
  useEffect(() => {
    if (!userid || !roleid) return;
    if (adminViewingStartupId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        let userIncId;
        if (selectedIncubation) {
          userIncId = selectedIncubation.incubationsrecid.toString();
        } else if (Number(roleid) === 1) {
          userIncId = "ALL";
        } else {
          userIncId = incuserid;
        }

        // =================================================================
        // ROLE-BASED API CALL LOGIC
        // =================================================================

        // DEFINE which roles can see STATISTICS. Only add roles to this array.
        // Currently, ONLY Admin (roleid 1) is allowed.
        const rolesAllowedForStats = [1];

        let apiCalls = [];

        // CONDITIONALLY ADD stats APIs based on whitelist.
        // If the current user's role is NOT in the list, this block is skipped.
        if (rolesAllowedForStats.includes(Number(roleid))) {
          // This block will ONLY run for roleid 1.
          // It will be SKIPPED for roleid 4 and roleid 7.
          apiCalls = [
            ...apiCalls,
            {
              name: "stats",
              call: () =>
                api.post("/generic/getstatscom", {
                  userId: userid,
                  userIncId: userIncId,
                }),
            },
            {
              name: "field",
              call: () =>
                api.post("/generic/getcombyfield", {
                  userId: userid,
                  userIncId: userIncId,
                }),
            },
            {
              name: "stage",
              call: () =>
                api.post("/generic/getcombystage", {
                  userId: userid,
                  userIncId: userIncId,
                }),
            },
          ];
        }

        // ALWAYS ADD list/document APIs for any logged-in user.
        // This runs for roleid 1, 4, and 7.
        const userIdForListApis = Number(roleid) === 1 ? "ALL" : userid;
        apiCalls = [
          ...apiCalls,
          {
            name: "documents",
            call: () =>
              api.post("/generic/getcollecteddocsdash", {
                userId: userIdForListApis,
                incUserId: userIncId,
                startDate: fromYear,
                endDate: toYear,
              }),
          },
          {
            name: "incubatees",
            call: () =>
              api.post("/generic/getincubatessdash", {
                userId: userIdForListApis,
                incUserId: userIncId,
              }),
          },
        ];

        // =================================================================

        const results = await Promise.allSettled(
          apiCalls.map(({ call }) => call())
        );

        results.forEach((result, index) => {
          const { name } = apiCalls[index];
          if (result.status === "fulfilled") {
            const data = extractData(result.value, []);
            switch (name) {
              case "stats":
                setStats(data);
                break;
              case "field":
                setByField(data);
                break;
              case "stage":
                setByStage(data);
                break;
              case "documents":
                setCompanyDoc(data);
                if (Number(roleid) !== 1) setstartupcompanyDoc(data);
                break;
              case "incubatees":
                setListOfIncubatees(data);
                if (Number(roleid) !== 1) setstartupdetails(data);
                break;
              default:
                break;
            }
          } else {
            console.error(`Error fetching ${name}:`, result.reason);
            switch (name) {
              case "stats":
                setStats(null);
                break;
              case "field":
                setByField([]);
                break;
              case "stage":
                setByStage([]);
                break;
              case "documents":
                setCompanyDoc([]);
                if (Number(roleid) !== 1) setstartupcompanyDoc([]);
                break;
              case "incubatees":
                setListOfIncubatees([]);
                if (Number(roleid) !== 1) setstartupdetails([]);
                break;
              default:
                break;
            }
          }
        });
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setStats(null);
        setByField([]);
        setByStage([]);
        setCompanyDoc([]);
        setListOfIncubatees([]);
        if (Number(roleid) !== 1) {
          setstartupcompanyDoc([]);
          setstartupdetails([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    userid,
    roleid,
    fromYear,
    toYear,
    adminViewingStartupId,
    selectedIncubation,
  ]);

  return (
    <DataContext.Provider
      value={{
        /* ... all your context values ... */
        stats,
        byField,
        byStage,
        companyDoc,
        setCompanyDoc,
        listOfIncubatees,
        setListOfIncubatees,
        loading,
        userid,
        setUserid,
        setroleid,
        fromYear,
        setFromYear,
        toYear,
        setToYear,
        roleid,
        startupcompanyDoc,
        setstartupcompanyDoc,
        startupdetails,
        setstartupdetails,
        currentCompanyDetails,
        setCurrentCompanyDetails,
        refreshCompanyDocuments,
        fetchStartupDataForAdmin,
        fetchStartupDataById,
        resetAdminView,
        clearAllData,
        adminViewingStartupId,
        adminStartupLoading,
        adminviewData,
        setadminviewData,
        incuserid,
        setincuserid,
        incubationList,
        selectedIncubation,
        incubationDetails,
        incubationLoading,
        fetchIncubationList,
        fetchIncubationDetails,
        handleIncubationSelect,
        resetIncubationSelection,
        fetchDocumentsByDateRange, // NEW: Add this to the context
        dateFilterLoading, // NEW: Add this to the context
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
