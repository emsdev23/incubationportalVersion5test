import { useState, useContext, useEffect, useMemo } from "react";
import styles from "./StartupDashboard.module.css";
import companyLogo from "../../Images/company6.png";
import DocumentUploadModal from "./DocumentUploadModal";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import DDIDocumentsTable from "../DDI/DDIDocumentsTable";
import { FaExternalLinkAlt } from "react-icons/fa";
import { GoLink } from "react-icons/go";
import { HiLink } from "react-icons/hi";
import { Link } from "react-router-dom";
import Spinner from "../../Components/Spinner";
import style from "../Navbar.module.css";
import { Download } from "lucide-react";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Upload,
  Calendar,
  Users,
  TrendingUp,
  LogOut,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  CircleUserRound,
  Mail,
  MessageSquare,
} from "lucide-react";
import ITELLogo from "../../assets/ITEL_Logo.png";
import * as XLSX from "xlsx";

import { DataContext } from "../Datafetching/DataProvider";
import ChangePasswordModal from "./ChangePasswordModal";
import ContactModal from "./ContactModal";
import DocumentsTable from "../DocumentUpload/DocumentsTable";
import { IPAdress } from "../Datafetching/IPAdrees";

// Material UI imports
import { DataGrid } from "@mui/x-data-grid";
import Paper from "@mui/material/Paper";
import {
  Button,
  Box,
  Typography,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Modal,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";

// Styled components with proper prop forwarding
const StyledPaper = styled(Paper)(({ theme }) => ({
  width: "100%",
  marginBottom: theme.spacing(2),
}));

const StatusChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== "statusType",
})(({ theme, statusType }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case "Submitted":
        return { backgroundColor: "#d4edda", color: "#155724" };
      case "Pending":
        return { backgroundColor: "#fff3cd", color: "#856404" };
      case "Overdue":
        return { backgroundColor: "#f8d7da", color: "#721c24" };
      default:
        return { backgroundColor: "#e2e3e5", color: "#383d41" };
    }
  };

  return {
    ...getStatusColor(statusType),
    fontWeight: 500,
    borderRadius: 4,
  };
});

const DocStateChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== "stateType",
})(({ theme, stateType }) => {
  const getStateColor = (state) => {
    switch (state) {
      case "Obsolete":
        return { backgroundColor: "#f8d7da", color: "#721c24" };
      case "Not Obsolete":
        return { backgroundColor: "#d4edda", color: "#155724" };
      default:
        return { backgroundColor: "#e2e3e5", color: "#383d41" };
    }
  };

  return {
    ...getStateColor(stateType),
    fontWeight: 500,
    borderRadius: 4,
  };
});

// Common date formatting function
const formatDate = (dateString) => {
  if (!dateString) return "-";

  try {
    // Handle the "Z" suffix properly
    const formattedDate = dateString.endsWith("Z")
      ? `${dateString.slice(0, -1)}T00:00:00Z`
      : dateString;

    return new Date(formattedDate).toLocaleDateString();
  } catch (error) {
    console.error("Error parsing date:", error);
    return dateString; // Return the original string as a fallback
  }
};

const StartupDashboard = () => {
  const {
    roleid,
    listOfIncubatees,
    companyDoc,
    startupcompanyDoc,
    startupdetails,
    setadminviewData,
    refreshCompanyDocuments,
    adminStartupLoading,
    adminviewData,
    clearAllData,
    userid,
    incuserid,
    selectedIncubation,
  } = useContext(DataContext);

  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Sorting state for documents table
  const [sortModel, setSortModel] = useState([
    {
      field: "doccatname",
      sort: "asc",
    },
  ]);

  const location = useLocation();
  const navigate = useNavigate();

  // Get ID from location state instead of params
  const stateUsersRecid = location.state?.usersrecid;
  const companyName = location.state?.companyName;

  // Set the adminviewData when component mounts or state changes
  useEffect(() => {
    if (stateUsersRecid) {
      setadminviewData(stateUsersRecid);
    } else if (
      Number(roleid) === 1 ||
      Number(roleid) === 3 ||
      (Number(roleid) === 7 && !adminviewData)
    ) {
      // Redirect admin back to company list if no startup selected
      navigate("/Incubation/Dashboard");
    }
  }, [stateUsersRecid, setadminviewData, roleid, adminviewData, navigate]);

  // Determine which data to use based on role and admin viewing state
  const getIncubateeData = () => {
    if (
      Number(roleid) === 1 ||
      Number(roleid) === 3 ||
      (Number(roleid) === 7 && adminviewData)
    ) {
      // Admin viewing specific startup - use startupdetails
      return startupdetails?.[0];
    } else if (Number(roleid) === 4) {
      // Regular user - use listOfIncubatees
      return listOfIncubatees?.[0];
    }
    return null;
  };

  const getCompanyDocuments = () => {
    if (
      Number(roleid) === 1 ||
      Number(roleid) === 3 ||
      (Number(roleid) === 7 && adminviewData)
    ) {
      // Admin viewing specific startup - use startupcompanyDoc
      return startupcompanyDoc || [];
    } else if (Number(roleid) === 4) {
      // Regular user - use companyDoc
      return companyDoc || [];
    }
    return [];
  };

  const incubatee = getIncubateeData();
  const documentsData = getCompanyDocuments();

  // Company details
  const incubateesname = incubatee?.incubateesname;
  const incubateesdateofincorporation =
    incubatee?.incubateesdateofincorporation;
  const incubateesdateofincubation = incubatee?.incubateesdateofincubation;
  const incubateesfieldofworkname = incubatee?.incubateesfieldofworkname;
  const incubateesstagelevelname = incubatee?.incubateesstagelevelname;
  const incubateesfoundername = incubatee?.incubateesfoundername;
  const incubateesrecid = incubatee?.incubateesrecid;
  const usersrecid = incubatee?.usersrecid;
  const founderName = incubatee?.incubateesfoundername;
  const incubateeslogopath = incubatee?.incubateeslogopath;
  const incubateeswebsite = incubatee?.incubateeswebsite;
  const userRecID = incubatee?.usersrecid;

  const Title = selectedIncubation.incubationshortname;
  console.log(Title);

  // Local state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [localCompanyDoc, setLocalCompanyDoc] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Filter and pagination state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });

  // Check if XLSX is available
  const isXLSXAvailable = !!XLSX;

  // Update local state when context data changes
  useEffect(() => {
    setLocalCompanyDoc(documentsData);
  }, [documentsData]);

  // Sort and filter documents using useMemo for performance
  const processedDocuments = useMemo(() => {
    // First filter the data
    return localCompanyDoc.filter((doc) => {
      const matchesSearch =
        doc.doccatname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.docsubcatname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.status?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || doc.status === statusFilter;
      const matchesCategory =
        categoryFilter === "all" || doc.doccatname === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [localCompanyDoc, searchTerm, statusFilter, categoryFilter]);

  // Add unique ID to each row if not present
  const rowsWithId = useMemo(() => {
    return processedDocuments.map((item, index) => ({
      ...item,
      id: item.doccatname + item.docsubcatname + index, // Create a unique ID
    }));
  }, [processedDocuments]);

  // Export to CSV function
  const exportToCSV = () => {
    // Create a copy of the data for export
    const exportData = processedDocuments.map((item) => ({
      "Document Category": item.doccatname || "",
      "Document SubCategory": item.docsubcatname || "",
      "Document Name": item.documentname || "",
      Status: item.status || "",
      Periodicity: item.periodicity || "",
      "Upload Date": formatDate(item.submission_date),
      "Due Date": formatDate(item.due_date),
      "Document State": item.collecteddocobsoletestate || "---",
    }));

    // Convert to CSV
    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
      headers.join(","),
      ...exportData.map((row) =>
        headers
          .map((header) => {
            // Handle values that might contain commas
            const value = row[header];
            return typeof value === "string" && value.includes(",")
              ? `"${value}"`
              : value;
          })
          .join(",")
      ),
    ].join("\n");

    // Create a blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `documents_${new Date().toISOString().slice(0, 10)}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Excel function
  const exportToExcel = () => {
    if (!isXLSXAvailable) {
      console.error("XLSX library not available");
      alert("Excel export is not available. Please install the xlsx package.");
      return;
    }

    try {
      // Create a copy of the data for export
      const exportData = processedDocuments.map((item) => ({
        "Document Category": item.doccatname || "",
        "Document SubCategory": item.docsubcatname || "",
        "Document Name": item.documentname || "",
        Status: item.status || "",
        Periodicity: item.periodicity || "",
        "Upload Date": formatDate(item.submission_date),
        "Due Date": formatDate(item.due_date),
        "Document State": item.collecteddocobsoletestate || "---",
      }));

      // Create a workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(wb, ws, "Documents");

      // Generate the Excel file and download
      XLSX.writeFile(
        wb,
        `documents_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Error exporting to Excel. Falling back to CSV export.");
      exportToCSV();
    }
  };

  // Show loading state when admin is fetching startup data
  if (
    adminStartupLoading ||
    (Number(roleid) === 1 && adminviewData && !incubatee)
  ) {
    return (
      <div>
        <Spinner />
      </div>
    );
  }

  // Show message if no data is available
  if (!incubatee) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg text-gray-600">
          {Number(roleid) === 1
            ? "Please select a startup to view from the admin panel."
            : "No startup data found."}
        </div>
      </div>
    );
  }

  const convertData = (dateStr) => {
    const dateObj = new Date(dateStr);
    const formatted = dateObj.toLocaleDateString("en-GB");
    return formatted;
  };

  // Get unique categories and statuses for filters
  const uniqueCategories = [
    ...new Set(localCompanyDoc.map((doc) => doc.doccatname)),
  ];
  const uniqueStatuses = [...new Set(localCompanyDoc.map((doc) => doc.status))];

  // Manual refresh function to fetch company documents
  const fetchCompanyDocuments = async () => {
    try {
      const token = sessionStorage.getItem("token");
      const userid = sessionStorage.getItem("userid");

      const response = await fetch(
        `${IPAdress}/itelinc/resources/generic/getcompanydocs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userid: userid,
            incubateesrecid: incubateesrecid,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.statusCode === 200) {
        setLocalCompanyDoc(data.data);
      }
    } catch (error) {
      console.error("Error fetching company documents:", error);
    }
  };

  // Handle document upload success
  const handleDocumentUpload = async () => {
    try {
      if (refreshCompanyDocuments) {
        await refreshCompanyDocuments();
      } else {
        await fetchCompanyDocuments();
      }
      // Reset filters and pagination after upload
      setSearchTerm("");
      setStatusFilter("all");
      setCategoryFilter("all");
      setPaginationModel({ page: 0, pageSize: 10 });
    } catch (error) {
      console.error("Error refreshing documents:", error);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  // Calculate stats based on actual API data (localCompanyDoc)
  const totalDocuments = localCompanyDoc.length;

  // Count documents that are submitted AND not obsolete
  const submittedDocuments = localCompanyDoc.filter(
    (d) =>
      d.status === "Submitted" && d.collecteddocobsoletestate !== "Obsolete"
  ).length;

  // Pending: status is Pending or Obsolete
  const pendingDocuments = localCompanyDoc.filter(
    (d) =>
      d.status === "Pending" ||
      (d.status === "Submitted" && d.collecteddocobsoletestate === "Obsolete")
  ).length;

  // Overdue: still the same
  const overdueDocuments = localCompanyDoc.filter(
    (d) => d.status === "Overdue"
  ).length;

  // Completion rate: submitted / total
  const completionRate =
    totalDocuments > 0 ? (submittedDocuments / totalDocuments) * 100 : 0;

  const getStatusIcon = (status) => {
    switch (status) {
      case "Submitted":
        return <CheckCircle className={styles.iconApproved} />;
      case "Pending":
        return <Clock className={styles.iconPending} />;
      case "Overdue":
        return <AlertCircle className={styles.iconOverdue} />;
      default:
        return <FileText className={styles.iconDefault} />;
    }
  };

  const handleViewDocument = async (filepath) => {
    console.log(filepath);
    try {
      const token = sessionStorage.getItem("token");
      const userid = sessionStorage.getItem("userid");

      const response = await fetch(
        `${IPAdress}/itelinc/resources/generic/getfileurl`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userid: userid,
            url: filepath,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.statusCode === 200 && data.data) {
        const fileUrl = data.data;
        const fileExtension = filepath.split(".").pop().toLowerCase();

        // Previewable formats
        const previewable = ["pdf", "png", "jpeg", "jpg"];

        if (previewable.includes(fileExtension)) {
          // Open preview modal
          setPreviewUrl(fileUrl);
          setIsPreviewOpen(true);
        } else {
          // Non-previewable formats: show SweetAlert to download
          Swal.fire({
            icon: "info",
            title: "No Preview Available",
            text: "This document cannot be previewed. Click download to get the file.",
            showCancelButton: true,
            confirmButtonText: "Download",
            cancelButtonText: "Cancel",
          }).then((result) => {
            if (result.isConfirmed) {
              const link = document.createElement("a");
              link.href = fileUrl;
              link.download = filepath.split("/").pop(); // use original filename
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
          });
        }
      } else {
        throw new Error(data.message || "Failed to fetch document");
      }
    } catch (error) {
      console.error("Error fetching file:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Unable to load document: " + error.message,
      });
    }
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

      const userid = String(JSON.parse(sessionStorage.getItem("userid")));
      const incUserId = String(JSON.parse(sessionStorage.getItem("incUserid")));
      const token = sessionStorage.getItem("token");

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

  const handleBackToAdmin = () => {
    navigate("/Incubation/Dashboard");
  };

  const handleAbolishDocument = async (filepath) => {
    try {
      const result = await Swal.fire({
        title: "Are you sure?",
        text: "Do you want to mark this document as Obsolete? This action cannot be undone.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, mark it!",
        cancelButtonText: "Cancel",
      });

      if (!result.isConfirmed) return;

      const userId = sessionStorage.getItem("userid");
      const token = sessionStorage.getItem("token");

      if (!userId || !token) {
        Swal.fire(
          "Error",
          "User authentication not found. Please login again.",
          "error"
        );
        return;
      }

      const response = await fetch(
        `${IPAdress}/itelinc/resources/generic/markobsolete?modifiedBy=${userId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ url: filepath }),
        }
      );

      const resultData = await response.json();

      if (response.ok && resultData.statusCode === 200) {
        console.log("Document marked as obsolete:", resultData);

        Swal.fire(
          "Marked Obsolete!",
          "Document has been successfully marked as obsolete.",
          "success"
        );

        if (refreshCompanyDocuments) {
          await refreshCompanyDocuments();
        } else if (fetchCompanyDocuments) {
          await fetchCompanyDocuments();
        }
      } else {
        console.error("Failed to mark document as obsolete:", resultData);
        Swal.fire(
          "Failed",
          resultData.message ||
            "Failed to mark document as obsolete. Please try again.",
          "error"
        );
      }
    } catch (error) {
      console.error("Error marking document as obsolete:", error);
      Swal.fire(
        "Error",
        "An error occurred while marking the document as obsolete.",
        "error"
      );
    }
  };

  // Define columns for DataGrid with proper null checks
  const columns = [
    {
      field: "doccatname",
      headerName: "Document Category",
      width: 200,
      sortable: true,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {getStatusIcon(params.row?.status)}
          <Typography variant="body2">{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: "docsubcatname",
      headerName: "Document SubCategory",
      width: 200,
      sortable: true,
    },
    {
      field: "documentname",
      headerName: "Document Name",
      width: 200,
      sortable: true,
    },
    {
      field: "status",
      headerName: "Status",
      width: 150,
      sortable: true,
      renderCell: (params) => (
        <StatusChip
          statusType={params.value}
          label={params.value}
          size="small"
        />
      ),
    },
    {
      field: "periodicity",
      headerName: "Periodicity",
      width: 150,
      sortable: true,
    },
    {
      field: "submission_date",
      headerName: "Submission Date",
      width: 150,
      sortable: true,
      renderCell: (params) => {
        if (!params || !params.row) return "Not submitted";
        return params.row.submission_date
          ? formatDate(params.row.submission_date)
          : "Not submitted";
      },
    },
    {
      field: "due_date",
      headerName: "Due Date",
      width: 150,
      sortable: true,
      renderCell: (params) => {
        if (!params || !params.row) return <Box>-</Box>;
        const statusNormalized = (params.row.status || "").toLowerCase();
        return (
          <Box
            sx={{
              color: statusNormalized === "overdue" ? "error.main" : "inherit",
            }}
          >
            {formatDate(params.row.due_date)}
          </Box>
        );
      },
    },
    {
      field: "collecteddocobsoletestate",
      headerName: "Doc State",
      width: 150,
      sortable: true,
      renderCell: (params) =>
        params.value ? (
          <DocStateChip
            stateType={params.value}
            label={params.value}
            size="small"
          />
        ) : (
          <Typography variant="body2">---</Typography>
        ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 200,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          {params.row?.filepath && params.row?.status === "Submitted" ? (
            <Button
              variant="outlined"
              size="small"
              onClick={() => handleViewDocument(params.row.filepath)}
            >
              View Doc
            </Button>
          ) : (
            <Button
              variant="outlined"
              size="small"
              onClick={() => handleViewDocument(params.row?.filepath)}
              disabled={!params.row?.filepath}
            >
              {params.row?.filepath ? "View Doc" : "No File"}
            </Button>
          )}

          {params.row?.collecteddocobsoletestate === "Not Obsolete" &&
            Number(roleid) !== 1 &&
            Number(roleid) !== 3 && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => handleAbolishDocument(params.row?.filepath)}
              >
                Obsolete
              </Button>
            )}
        </Box>
      ),
    },
  ];

  return (
    <div>
      {/* Navigation bar */}
      <header className={style.header}>
        <div className={style.container}>
          <div className={style.logoSection}>
            <img src={ITELLogo} className={style.logoIcon} alt="ITEL Logo" />
            <div>
              <h1 className={style.title}>{Title}</h1>
              <p className={style.subtitle}>
                {Number(roleid) === 1
                  ? "Admin Dashboard"
                  : "Startup Management Dashboard"}
              </p>
            </div>
          </div>

          <div className={style.actions}>
            {/* Show back button for admin */}
            {(Number(roleid) === 1 ||
              Number(roleid) === 3 ||
              Number(roleid) === 7) &&
              adminviewData && (
                <button
                  className={style.btnPrimary}
                  onClick={handleBackToAdmin}
                  style={{
                    background: "#63e6be",
                    display: "flex",
                    fontWeight: "bold",
                    color: "#0b7285",
                  }}
                >
                  <ArrowLeft className={style.icon} />
                  Back to Portal
                </button>
              )}

            {/* Chat button */}
            {Number(roleid) === 4 && (
              <button
                className={style.btnPrimary}
                onClick={() => navigate(`/Incubation/Dashboard/Chats`)}
                style={{
                  background: "#4dabf7",
                  display: "flex",
                  fontWeight: "bold",
                  color: "#1864ab",
                }}
              >
                <MessageSquare className={style.icon} />
                Chat
              </button>
            )}

            {Number(roleid) === 4 && (
              <button
                className={style.btnPrimary}
                onClick={handleLogout}
                style={{ background: "#fa5252", fontWeight: "bold" }}
              >
                <LogOut className={style.icon} />
                Logout
              </button>
            )}

            {Number(roleid) === 4 && (
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
                onClick={() => setIsChangePasswordOpen(true)}
              >
                <CircleUserRound />
                <div>{founderName}</div>
              </div>
            )}

            {isChangePasswordOpen && Number(roleid) === 4 && (
              <ChangePasswordModal
                isOpen={isChangePasswordOpen}
                onClose={() => setIsChangePasswordOpen(false)}
              />
            )}

            {/* Contact Modal */}
            {isContactModalOpen && (
              <ContactModal
                isOpen={isContactModalOpen}
                onClose={() => setIsContactModalOpen(false)}
                userId={Number(userid)}
                incuserid={incuserid}
              />
            )}
          </div>
        </div>
      </header>

      {/* Startup dashboard */}
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.headerCard}>
          <div className={styles.headerContent}>
            <div className={styles.headerFlex}>
              <div
                style={{ display: "flex", alignItems: "center", gap: "2rem" }}
              >
                <div className={styles.avatarWrapper}>
                  <img
                    src={incubateeslogopath ? incubateeslogopath : companyLogo}
                    alt="Company Logo"
                    className={styles.avatarImage}
                  />
                  {incubateeswebsite !== null ? (
                    <div className={styles.avatarStatus}>
                      <Link
                        to={incubateeswebsite}
                        style={{ textDecoration: "none", color: "inherit" }}
                        target="blank"
                      >
                        <HiLink
                          style={{
                            width: "20px",
                            fontWeight: "bold",
                            cursor: "pointer",
                          }}
                        />
                      </Link>
                    </div>
                  ) : (
                    ""
                  )}
                </div>
                <div>
                  <h1 className="text-4xl font-bold mb-2">{incubateesname}</h1>
                </div>
              </div>
              <div>
                <div className={styles.headerBadges}>
                  <div className={styles.headerBadge}>
                    <Users className="h-4 w-4" /> Founded by:{" "}
                    {incubateesfoundername}
                  </div>
                  <div className={styles.headerBadge}>
                    <Calendar className="h-4 w-4" /> Date of Incorporation:
                    {incubateesdateofincorporation &&
                      convertData(incubateesdateofincorporation)}
                  </div>
                  <div className={styles.headerBadge}>
                    <Calendar className="h-4 w-4" /> Date of Incubation:
                    {incubateesdateofincubation &&
                      convertData(incubateesdateofincubation)}
                  </div>
                  <div className={styles.headerBadge}>
                    <TrendingUp className="h-4 w-4" />{" "}
                    {incubateesstagelevelname} Funding
                  </div>
                  <div className={styles.headerBadge}>
                    Field Of Work: {incubateesfieldofworkname}
                  </div>
                  <div
                    className={styles.headerBadge}
                    onClick={() => setIsContactModalOpen(true)}
                    style={{ cursor: "pointer" }}
                  >
                    <Mail className="h-4 w-4" />
                    Contact
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className={styles.statsGrid}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>Total Documents</div>
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className={styles.cardContent}>{totalDocuments}</div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>Submitted</div>
              <div
                className={styles.tooltip}
                data-tooltip="Documents that have been submitted in the portal"
              >
                <CheckCircle className={styles.iconApproved} />
              </div>
            </div>
            <div className={styles.cardContent}>{submittedDocuments}</div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>Pending</div>
              <div
                className={styles.tooltip}
                data-tooltip="Monthly due Documents"
              >
                <Clock className={styles.iconPending} />
              </div>
            </div>
            <div className={styles.cardContent}>{pendingDocuments}</div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>Overdue</div>
              <AlertCircle className={styles.iconOverdue} />
            </div>
            <div className={styles.cardContent}>{overdueDocuments}</div>
          </div>
        </div>

        {/* Progress */}
        <div className={styles.card}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h2 className="text-xl font-bold mb-2">Document Update Progress</h2>
            {Number(roleid) === 4 && (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  className={styles.buttonPrimary}
                  onClick={() => setIsModalOpen(true)}
                >
                  <Upload className="h-4 w-4 mr-2" /> Add Document
                </button>
              </div>
            )}
          </div>

          <p className="text-gray-600 mb-2">
            {Number(roleid) === 1
              ? "Viewing document update progress for this startup"
              : "Complete your document updates by submitting all required documents"}
          </p>

          <br />
          <div className={styles.progressBarContainer}>
            <div
              className={styles.progressBar}
              style={{
                width: `${completionRate}%`,
                textAlign: "center",
                color: "#fff",
                fontWeight: "bold",
              }}
            >
              {Math.round(completionRate)}%
            </div>
          </div>
          <div className={styles.progressStats}>
            <div
              className={`${styles.progressStat} ${styles.progressApproved}`}
            >
              <div className={styles.progressDot}></div>
              <div>{submittedDocuments} Submitted</div>
            </div>
            <div className={`${styles.progressStat} ${styles.progressPending}`}>
              <div className={styles.progressDot}></div>
              <div>{pendingDocuments} Pending</div>
            </div>
            <div className={`${styles.progressStat} ${styles.progressOverdue}`}>
              <div className={styles.progressDot}></div>
              <div>{overdueDocuments} Overdue</div>
            </div>
          </div>
        </div>

        <br />
        <br />

        {/* Filter Section */}

        {/* Documents Table with Material UI */}
        <div className={styles.documentsTableFull} style={{ width: "100%" }}>
          <StyledPaper>
            <div className={styles.filterSection}>
              <div className={styles.filterGroup}>
                {/* Export Buttons */}
                <div
                  className={styles.cardHeader}
                  style={{ display: "flex", gap: "2rem" }}
                >
                  <Typography variant="h5">Documents</Typography>
                  <div className={styles.searchBox}>
                    <Search className={styles.searchIcon} />
                    <input
                      type="text"
                      placeholder="Search documents..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setPaginationModel({ ...paginationModel, page: 0 });
                      }}
                      className={styles.searchInput}
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPaginationModel({ ...paginationModel, page: 0 });
                    }}
                    className={styles.filterSelect}
                  >
                    <option value="all">All Statuses</option>
                    {uniqueStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>

                  <select
                    value={categoryFilter}
                    onChange={(e) => {
                      setCategoryFilter(e.target.value);
                      setPaginationModel({ ...paginationModel, page: 0 });
                    }}
                    className={styles.filterSelect}
                  >
                    <option value="all">All Categories</option>
                    {uniqueCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={<Download size={16} />}
                      onClick={exportToCSV}
                      title="Export as CSV"
                    >
                      Export CSV
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Download size={16} />}
                      onClick={exportToExcel}
                      title="Export as Excel"
                      disabled={!isXLSXAvailable}
                    >
                      Export Excel
                    </Button>
                  </Box>
                </div>
              </div>

              <div className={styles.resultsInfo}>
                Showing {processedDocuments.length} of {localCompanyDoc.length}{" "}
                documents
              </div>
            </div>

            <DataGrid
              rows={rowsWithId}
              columns={columns}
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              pageSizeOptions={[5, 10, 25, 50]}
              sortModel={sortModel}
              onSortModelChange={setSortModel}
              disableRowSelectionOnClick
              sx={{
                border: 0,
                "& .MuiDataGrid-root": {
                  overflow: "auto",
                },
                "& .MuiDataGrid-cell": {
                  whiteSpace: "normal !important",
                  wordWrap: "break-word !important",
                },
                "& .MuiDataGrid-columnHeaders": {
                  backgroundColor: "#f5f5f5",
                  fontWeight: "bold",
                },
                "& .MuiDataGrid-columnHeader--sortable": {
                  cursor: "pointer",
                  "&:hover": {
                    backgroundColor: "#eeeeee",
                  },
                },
              }}
            />
          </StyledPaper>
        </div>

        {/* Preview Modal */}
        <Modal
          open={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          aria-labelledby="document-preview-modal"
          aria-describedby="modal for document preview"
        >
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "80%",
              bgcolor: "background.paper",
              boxShadow: 24,
              p: 4,
              maxHeight: "80vh",
              overflow: "auto",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
              <IconButton onClick={() => setIsPreviewOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
            <iframe
              src={previewUrl}
              title="Document Preview"
              width="100%"
              height="500px"
              style={{ border: "none" }}
            />
          </Box>
        </Modal>

        {/* Add Document Modal - Only for users */}
        {isModalOpen && Number(roleid) === 4 && (
          <DocumentUploadModal
            isModalOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
            incubateesrecid={incubateesrecid}
            usersrecid={usersrecid}
            onUploadSuccess={handleDocumentUpload}
            incuserid={incuserid}
          />
        )}
      </div>
      <br />
      {Number(roleid) === 4 && <DocumentsTable />}

      <br />
      <DDIDocumentsTable userRecID={userRecID} />
    </div>
  );
};

export default StartupDashboard;
