import React, {
  useState,
  useContext,
  useEffect,
  useMemo,
  useCallback,
} from "react";
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
import { Download, Share2 } from "lucide-react";
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
  Plus,
} from "lucide-react";
import ITELLogo from "../../assets/ITEL_Logo.png";
import * as XLSX from "xlsx";

import { DataContext } from "../Datafetching/DataProvider";
import ChangePasswordModal from "./ChangePasswordModal";
import ContactModal from "./ContactModal";
import DocumentsTable from "../DocumentUpload/DocumentsTable";
import { IPAdress } from "../Datafetching/IPAdrees";
import AuditLogsModal from "../AuditLogsModal ";
import ShareDocumentModal from "./ShareDocumentModal";
import VisibilityIcon from "@mui/icons-material/Visibility";

// Import ReusableDataGrid component
import ReusableDataGrid from "../Datafetching/ReusableDataGrid";

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
  Popover,
  Card,
  CardContent,
  CardActions,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import { FaFilter, FaTimes } from "react-icons/fa";

// Date Picker imports
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

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

// Common date formatting function - FIXED
const formatDate = (dateInput) => {
  if (!dateInput) return "-";

  try {
    // If input is already a Date object (from DatePicker), format it directly.
    if (dateInput instanceof Date) {
      return dateInput.toLocaleDateString();
    }

    // If input is a string (from your API), proceed with original logic.
    // Handle the "Z" suffix properly for ISO date strings.
    const dateString = String(dateInput); // Ensure it's a string
    const formattedDate = dateString.endsWith("Z")
      ? `${dateString.slice(0, -1)}T00:00:00Z`
      : dateString;

    return new Date(formattedDate).toLocaleDateString();
  } catch (error) {
    console.error("Error parsing date:", error);
    // Return the original input as a fallback, converting it to a string just in case.
    return String(dateInput);
  }
};

// Format date for API (YYYY-MM-DD)
const formatDateForAPI = (date) => {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
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
    // Add date filtering states and functions from context
    fromYear,
    setFromYear,
    toYear,
    setToYear,
    fetchDocumentsByDateRange,
    dateFilterLoading,
  } = useContext(DataContext);

  // ALL STATE HOOKS MUST BE DECLARED AT THE TOP - NO CONDITIONALS
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [documentCategories, setDocumentCategories] = useState([]);
  const [documentSubcategories, setDocumentSubcategories] = useState([]);
  const [documentInfo, setDocumentInfo] = useState([]);
  const [isLoadingDocData, setIsLoadingDocData] = useState(false);
  const [sortModel, setSortModel] = useState([
    { field: "doccatname", sort: "asc" },
  ]);

  // Add state variables to store the initial values
  const [initialFromDate, setInitialFromDate] = useState(null);
  const [initialToDate, setInitialToDate] = useState(null);

  // Date filter states
  const [startDate, setStartDate] = useState(
    fromYear ? new Date(fromYear) : null
  );
  const [endDate, setEndDate] = useState(toYear ? new Date(toYear) : null);
  const [datesSelected, setDatesSelected] = useState(!!(fromYear && toYear));

  // Column filter states
  const [columnFilters, setColumnFilters] = useState({
    doccatname: "",
    docsubcatname: "",
    documentname: "",
    periodicity: "",
    submission_date: "",
    due_date: "",
    status: "",
    collecteddocobsoletestate: "",
  });

  // Filter popover states
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [filterColumn, setFilterColumn] = useState(null);

  // Other states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [localCompanyDoc, setLocalCompanyDoc] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });

  // ALL HOOKS MUST BE DECLARED BEFORE ANY CONDITIONALS
  const location = useLocation();
  const navigate = useNavigate();

  // Memoized callbacks to prevent re-renders
  const handleFilterClick = useCallback((event, column) => {
    setFilterAnchorEl(event.currentTarget);
    setFilterColumn(column);
  }, []);

  const handleFilterClose = useCallback(() => {
    setFilterAnchorEl(null);
    setFilterColumn(null);
  }, []);

  const handleFilterChange = useCallback((column, value) => {
    setColumnFilters((prev) => ({
      ...prev,
      [column]: value,
    }));
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }, []);

  const clearFilter = useCallback(() => {
    setColumnFilters((prev) => ({
      ...prev,
      [filterColumn]: "",
    }));
  }, [filterColumn]);

  const clearAllFilters = useCallback(() => {
    setColumnFilters({
      doccatname: "",
      docsubcatname: "",
      documentname: "",
      periodicity: "",
      submission_date: "",
      due_date: "",
      status: "",
      collecteddocobsoletestate: "",
    });
    setSearchTerm("");
    setStartDate(null);
    setEndDate(null);
    setDatesSelected(false);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }, []);

  const handleDateChange = useCallback(
    (type, newValue) => {
      if (type === "start") {
        setStartDate(newValue);
      } else {
        setEndDate(newValue);
      }
      setDatesSelected(
        !!(type === "start" ? newValue && endDate : startDate && newValue)
      );
    },
    [startDate, endDate]
  );

  const handleApplyDateFilter = useCallback(() => {
    if (!startDate || !endDate) {
      Swal.fire({
        icon: "warning",
        title: "Incomplete Date Range",
        text: "Please select both start and end dates.",
      });
      return;
    }

    const formattedStartDate = formatDateForAPI(startDate);
    const formattedEndDate = formatDateForAPI(endDate);

    setFromYear(formattedStartDate);
    setToYear(formattedEndDate);

    fetchDocumentsByDateRange(formattedStartDate, formattedEndDate);

    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }, [startDate, endDate, setFromYear, setToYear, fetchDocumentsByDateRange]);

  // Rename resetDateFilter to clearDates and update it
  const clearDates = useCallback(() => {
    // Reset to the initial values stored from the context
    setStartDate(initialFromDate ? new Date(initialFromDate) : null);
    setEndDate(initialToDate ? new Date(initialToDate) : null);
    setDatesSelected(!!(initialFromDate && initialToDate));

    // Reset the context state to the initial values
    setFromYear(initialFromDate);
    setToYear(initialToDate);

    // Fetch the data using the initial date values
    fetchDocumentsByDateRange(initialFromDate, initialToDate);

    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }, [
    initialFromDate,
    initialToDate,
    setFromYear,
    setToYear,
    fetchDocumentsByDateRange,
  ]);

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
      navigate("/Incubation/Dashboard");
    }
  }, [stateUsersRecid, setadminviewData, roleid, adminviewData, navigate]);

  // Sync date states with context and store initial values
  useEffect(() => {
    setStartDate(fromYear ? new Date(fromYear) : null);
    setEndDate(toYear ? new Date(toYear) : null);
    setDatesSelected(!!(fromYear && toYear));

    // Store the initial values only once when the component first loads
    if (initialFromDate === null && fromYear) {
      setInitialFromDate(fromYear);
    }
    if (initialToDate === null && toYear) {
      setInitialToDate(toYear);
    }
  }, [fromYear, toYear, initialFromDate, initialToDate]);

  // Determine which data to use based on role and admin viewing state
  const getIncubateeData = () => {
    if (
      Number(roleid) === 1 ||
      Number(roleid) === 3 ||
      (Number(roleid) === 7 && adminviewData)
    ) {
      return startupdetails?.[0];
    } else if (Number(roleid) === 4) {
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
      return startupcompanyDoc || [];
    } else if (Number(roleid) === 4) {
      return companyDoc || [];
    }
    return [];
  };

  const incubatee = getIncubateeData();
  const documentsData = getCompanyDocuments();

  // Update local state when context data changes
  useEffect(() => {
    setLocalCompanyDoc(documentsData);
  }, [documentsData]);

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
  const token = sessionStorage.getItem("token");
  const Title =
    selectedIncubation !== null
      ? selectedIncubation.incubationshortname
      : "Startup Dashboard";

  // Check if XLSX is available
  const isXLSXAvailable = !!XLSX;

  // Sort and filter documents using useMemo for performance
  const processedDocuments = useMemo(() => {
    if (!localCompanyDoc) return [];

    return localCompanyDoc.filter((doc) => {
      const matchesDocCatName = columnFilters.doccatname
        ? (doc.doccatname || "")
            .toLowerCase()
            .includes(columnFilters.doccatname.toLowerCase())
        : true;

      const matchesDocSubCatName = columnFilters.docsubcatname
        ? (doc.docsubcatname || "")
            .toLowerCase()
            .includes(columnFilters.docsubcatname.toLowerCase())
        : true;

      const matchesDocumentName = columnFilters.documentname
        ? (doc.documentname || "")
            .toLowerCase()
            .includes(columnFilters.documentname.toLowerCase())
        : true;

      const matchesPeriodicity = columnFilters.periodicity
        ? (doc.periodicity || "")
            .toLowerCase()
            .includes(columnFilters.periodicity.toLowerCase())
        : true;

      const matchesStatus = columnFilters.status
        ? (doc.status || "")
            .toLowerCase()
            .includes(columnFilters.status.toLowerCase())
        : true;

      const matchesDocState = columnFilters.collecteddocobsoletestate
        ? (doc.collecteddocobsoletestate || "")
            .toLowerCase()
            .includes(columnFilters.collecteddocobsoletestate.toLowerCase())
        : true;

      const matchesSearch =
        (doc.doccatname || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (doc.docsubcatname || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (doc.status || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatusDropdown =
        statusFilter === "all" || doc.status === statusFilter;
      const matchesCategoryDropdown =
        categoryFilter === "all" || doc.doccatname === categoryFilter;

      return (
        matchesDocCatName &&
        matchesDocSubCatName &&
        matchesDocumentName &&
        matchesPeriodicity &&
        matchesStatus &&
        matchesDocState &&
        matchesSearch &&
        matchesStatusDropdown &&
        matchesCategoryDropdown
      );
    });
  }, [
    localCompanyDoc,
    searchTerm,
    statusFilter,
    categoryFilter,
    columnFilters,
  ]);

  // Add unique ID to each row if not present
  const rowsWithId = useMemo(() => {
    return processedDocuments.map((item, index) => ({
      ...item,
      id: item.doccatname + item.docsubcatname + index,
    }));
  }, [processedDocuments]);

  // Check if any column has an active filter
  const hasActiveFilters = useMemo(() => {
    return (
      Object.values(columnFilters).some((value) => value !== "") ||
      startDate ||
      endDate
    );
  }, [columnFilters, startDate, endDate]);

  // Get unique categories and statuses for filters
  const uniqueCategories = useMemo(() => {
    return [...new Set(localCompanyDoc.map((doc) => doc.doccatname))];
  }, [localCompanyDoc]);

  const uniqueStatuses = useMemo(() => {
    return [...new Set(localCompanyDoc.map((doc) => doc.status))];
  }, [localCompanyDoc]);

  // Calculate stats based on actual API data (localCompanyDoc)
  const totalDocuments = localCompanyDoc.length;

  const submittedDocuments = useMemo(() => {
    return localCompanyDoc.filter(
      (d) =>
        d.status === "Submitted" && d.collecteddocobsoletestate !== "Obsolete"
    ).length;
  }, [localCompanyDoc]);

  // count for pending documents duplications check
  const pendingDocuments = useMemo(() => {
    console.log("--- Calculating pendingDocuments ---");

    // First, filter for documents that are considered "pending"
    const pendingDocs = localCompanyDoc.filter(
      (d) =>
        d.status === "Pending" ||
        (d.status === "Submitted" && d.collecteddocobsoletestate === "Obsolete")
    );

    console.log("All pending documents:", pendingDocs);
    console.log(
      `Total pending documents before deduplication: ${pendingDocs.length}`
    );

    // Create a Set to store unique keys
    const uniqueKeys = new Set();

    // Process each pending document
    pendingDocs.forEach((doc, index) => {
      // Create a unique key based on the combination of fields
      // Note: Fixed typo from doc.subcatname to doc.docsubcatname
      const docKey = `${doc.doccatname}|${doc.docsubcatname}|${doc.documentname}|${doc.periodicity}`;

      console.log(`Document ${index}: ${docKey}`);

      // Add the key to the Set (Sets automatically handle uniqueness)
      uniqueKeys.add(docKey);
    });

    // The number of unique keys is what we want
    const uniqueCount = uniqueKeys.size;

    // For debugging, log the unique keys and the count
    console.log("Unique pending document keys:", Array.from(uniqueKeys));
    console.log("Total unique pending document types:", uniqueCount);
    console.log("--- End of pendingDocuments calculation ---");

    return uniqueCount;
  }, [localCompanyDoc]);

  // count for overdue documents duplications check
  const overdueDocuments = useMemo(() => {
    console.log("--- Calculating overdueDocuments ---");

    // 1. Filter for documents that are considered "overdue"
    const overdueDocs = localCompanyDoc.filter((d) => d.status === "Overdue");

    console.log("All overdue documents:", overdueDocs);
    console.log(
      `Total overdue documents before deduplication: ${overdueDocs.length}`
    );

    // 2. Create a Set to store unique keys
    const uniqueKeys = new Set();

    // 3. Process each overdue document
    overdueDocs.forEach((doc, index) => {
      // Create a unique key based on the combination of fields
      const docKey = `${doc.doccatname}|${doc.docsubcatname}|${doc.documentname}|${doc.periodicity}`;

      console.log(`Overdue Document ${index}: ${docKey}`);

      // Add the key to the Set (Sets automatically handle uniqueness)
      uniqueKeys.add(docKey);
    });

    // 4. The number of unique keys is what we want
    const uniqueCount = uniqueKeys.size;

    // For debugging, log the unique keys and the count
    console.log("Unique overdue document keys:", Array.from(uniqueKeys));
    console.log("Total unique overdue document types:", uniqueCount);
    console.log("--- End of overdueDocuments calculation ---");

    return uniqueCount;
  }, [localCompanyDoc]);

  const completionRate = useMemo(() => {
    return totalDocuments > 0 ? (submittedDocuments / totalDocuments) * 100 : 0;
  }, [totalDocuments, submittedDocuments]);

  // Status icon helper
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
            userid: userid || "1",
            "X-Module": "Incubatee Documents",
            "X-Action": "Fetching Company Documents",
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
            userid: userid || "1",
            "X-Module": "Incubatee Documents",
            "X-Action": "Incubatee Document Preview",
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

        const previewable = ["pdf", "png", "jpeg", "jpg"];

        if (previewable.includes(fileExtension)) {
          setPreviewUrl(fileUrl);
          setIsPreviewOpen(true);
        } else {
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
              link.download = filepath.split("/").pop();
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

  const handleAddDocument = async (document) => {
    setIsLoadingDocData(true);

    try {
      const categories = await fetchDocumentCategories();

      const matchingCategory = categories.find(
        (cat) => cat.text === document.doccatname
      );

      if (!matchingCategory) {
        throw new Error(`Category "${document.doccatname}" not found`);
      }

      const subcategories = await fetchDocumentSubcategories(
        matchingCategory.value
      );

      const matchingSubcategory = subcategories.find(
        (subcat) => subcat.text === document.docsubcatname
      );

      if (!matchingSubcategory) {
        throw new Error(`Subcategory "${document.docsubcatname}" not found`);
      }

      const docInfo = await fetchDocumentInfo(
        matchingCategory.value,
        matchingSubcategory.value
      );

      const matchingDocInfo = docInfo.find(
        (info) => info.text === document.documentname
      );

      if (!matchingDocInfo) {
        throw new Error(`Document info "${document.documentname}" not found`);
      }

      setSelectedDocument({
        ...document,
        doccatid: matchingCategory.value,
        docsubcatid: matchingSubcategory.value,
        docinfoid: matchingDocInfo.value,
        categories: categories,
        subcategories: subcategories,
        docInfo: docInfo,
      });

      setIsModalOpen(true);
    } catch (error) {
      console.error("Error preparing document data:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to prepare document data: " + error.message,
      });
    } finally {
      setIsLoadingDocData(false);
    }
  };

  const handleLogout = async () => {
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

    if (!confirmResult.isConfirmed) return;

    try {
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

      const response = await fetch(
        `${IPAdress}/itelinc/resources/auth/logout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            userid: userid || "1",
            "X-Module": "log_out",
            "X-Action": "user Logout attempt",
          },
          body: JSON.stringify({
            userid,
            reason: `Manual Logout at ${currentTime}`,
          }),
        }
      );

      const data = await response.json();
      console.log("Logout response:", data);

      Swal.close();

      if (response.ok) {
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
            userid: userId || "1",
            "X-Module": "Document Obsolete",
            "X-Action": "Mark Document as Obsolete",
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

  // Export to CSV function
  const exportToCSV = useCallback(() => {
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

    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
      headers.join(","),
      ...exportData.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            return typeof value === "string" && value.includes(",")
              ? `"${value}"`
              : value;
          })
          .join(",")
      ),
    ].join("\n");

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
  }, [processedDocuments]);

  // Export to Excel function
  const exportToExcel = useCallback(() => {
    if (!isXLSXAvailable) {
      console.error("XLSX library not available");
      alert("Excel export is not available. Please install xlsx package.");
      return;
    }

    try {
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

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      XLSX.utils.book_append_sheet(wb, ws, "Documents");

      XLSX.writeFile(
        wb,
        `documents_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Error exporting to Excel. Falling back to CSV export.");
      exportToCSV();
    }
  }, [processedDocuments, isXLSXAvailable, exportToCSV]);

  // Define columns for ReusableDataGrid
  // Define columns for ReusableDataGrid
  const gridColumns = useMemo(() => {
    const baseColumns = [
      {
        field: "doccatname",
        headerName: "Document Category",
        width: 200,
        sortable: true,
        type: "text",
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
        type: "text",
      },
      {
        field: "documentname",
        headerName: "Document Name",
        width: 200,
        sortable: true,
        type: "text",
      },
      {
        field: "status",
        headerName: "Status",
        width: 150,
        sortable: true,
        type: "chip",
        chipColors: {
          Submitted: { backgroundColor: "#d4edda", color: "#155724" },
          Pending: { backgroundColor: "#fff3cd", color: "#856404" },
          Overdue: { backgroundColor: "#f8d7da", color: "#721c24" },
        },
      },
      {
        field: "periodicity",
        headerName: "Periodicity",
        width: 150,
        sortable: true,
        type: "text",
      },
      {
        field: "submission_date",
        headerName: "Submission Date",
        width: 150,
        sortable: true,
        type: "date",
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
        type: "date",
        renderCell: (params) => {
          if (!params || !params.row) return <Box>-</Box>;
          const statusNormalized = (params.row.status || "").toLowerCase();
          return (
            <Box
              sx={{
                color:
                  statusNormalized === "overdue" ? "error.main" : "inherit",
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
        type: "chip",
        chipColors: {
          Obsolete: { backgroundColor: "#f8d7da", color: "#721c24" },
          "Not Obsolete": { backgroundColor: "#ff8787", color: "#c92a2a" },
        },
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
        field: "linkeddoccat",
        headerName: "Linked Category",
        width: 200,
        sortable: true,
        filterable: true,
        renderCell: (params) => {
          if (!params?.row?.linkeddoccat) return <span>-</span>;
          return params.row.linkeddoccat;
        },
      },
      {
        field: "period_info",
        headerName: "Period Info",
        width: 200,
        sortable: true,
        filterable: true,
        renderCell: (params) => {
          if (!params?.row?.period_info) return <span>-</span>;
          return params.row.period_info;
        },
      },
      // New columns for sample document
      {
        field: "documenttemplatedocname",
        headerName: "Document Template",
        width: 200,
        sortable: true,
        filterable: true,
        renderCell: (params) => {
          if (!params?.row?.documenttemplatedocname) return <span>-</span>;
          return params.row.documenttemplatedocname;
        },
      },
      {
        field: "documentsampledoc",
        headerName: "Sample Document",
        width: 200,
        sortable: true,
        filterable: true,
        renderCell: (params) => {
          if (!params?.row?.documentsampledoc) return <span>-</span>;
          return (
            <Button
              variant="outlined"
              size="small"
              startIcon={<VisibilityIcon fontSize="small" />}
              onClick={() =>
                handleViewDocument(
                  params.row.documentsampledoc,
                  params.row.documentsampledocname || "Sample Document"
                )
              }
              sx={{
                padding: "4px 12px",
                fontSize: "0.75rem",
                fontWeight: 500,
                borderRadius: 6,
                textTransform: "none",
                backgroundColor: "#e3f2fd",
                color: "#1976d2",
                borderColor: "#bbdefb",
                "&:hover": {
                  backgroundColor: "#bbdefb",
                  color: "#1565c0",
                  borderColor: "#90caf9",
                },
              }}
            >
              View Document
            </Button>
          );
        },
      },
    ];

    // Add actions column only for roleid 4
    if (Number(roleid) === 4) {
      baseColumns.push({
        field: "actions",
        headerName: "Actions",
        width: 320,
        sortable: false,
        renderCell: (params) => {
          return (
            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
              {/* Add Button */}
              {params.row.status !== "Submitted" && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Plus size={14} />}
                  onClick={() => handleAddDocument(params.row)}
                  disabled={isLoadingDocData}
                >
                  Add
                </Button>
              )}

              {/* View Doc Button */}
              {params.row.status === "Submitted" && params.row.filepath && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleViewDocument(params.row.filepath)}
                >
                  View Doc
                </Button>
              )}

              {/* Share Button */}
              {params.row.status === "Submitted" && params.row.filepath && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Share2 size={14} />}
                  onClick={() => {
                    setSelectedDocument(params.row);
                    setIsShareModalOpen(true);
                  }}
                >
                  Share
                </Button>
              )}

              {/* Obsolete Button - Only shows when status is "Submitted" */}
              {params.row.status === "Submitted" && (
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
          );
        },
      });
    }
    return baseColumns;
  }, [roleid, isLoadingDocData]);
  // Define dropdown filters for ReusableDataGrid
  const dropdownFilters = useMemo(() => {
    return [
      {
        field: "status",
        label: "Status",
        options: [
          // { value: "all", label: "All Statuses" },
          ...uniqueStatuses.map((status) => ({
            value: status,
            label: status,
          })),
        ],
      },
      {
        field: "doccatname",
        label: "Category",
        options: [
          // { value: "all", label: "All Categories" },
          ...uniqueCategories.map((category) => ({
            value: category,
            label: category,
          })),
        ],
      },
    ];
  }, [uniqueStatuses, uniqueCategories]);

  // Custom export function for ReusableDataGrid
  const customExportData = useCallback((data) => {
    return data.map((item) => ({
      "Document Category": item.doccatname || "",
      "Document SubCategory": item.docsubcatname || "",
      "Document Name": item.documentname || "",
      Status: item.status || "",
      Periodicity: item.periodicity || "",
      "Upload Date": formatDate(item.submission_date),
      "Due Date": formatDate(item.due_date),
      "Document State": item.collecteddocobsoletestate || "---",
    }));
  }, []);

  // Function to fetch document categories
  const fetchDocumentCategories = async () => {
    try {
      const token = sessionStorage.getItem("token");
      const userId = sessionStorage.getItem("userid");
      const incUserId = sessionStorage.getItem("incuserid");

      const response = await fetch(
        `${IPAdress}/itelinc/resources/generic/getdoccat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId: userId,
            roleId: roleid || 0,
            userIncId: incUserId || 1,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.statusCode === 200) {
        setDocumentCategories(data.data);
        return data.data;
      } else {
        throw new Error(data.message || "Failed to fetch document categories");
      }
    } catch (error) {
      console.error("Error fetching document categories:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to fetch document categories: " + error.message,
      });
      return [];
    }
  };

  // Function to fetch document subcategories
  const fetchDocumentSubcategories = async (docCatId) => {
    try {
      const token = sessionStorage.getItem("token");
      const userId = sessionStorage.getItem("userid");
      const incUserId = sessionStorage.getItem("incuserid");

      const response = await fetch(
        `${IPAdress}/itelinc/resources/generic/getdocsubcat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userid: userId,
            docid: docCatId,
            userIncId: incUserId || 1,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.statusCode === 200) {
        setDocumentSubcategories(data.data);
        return data.data;
      } else {
        throw new Error(
          data.message || "Failed to fetch document subcategories"
        );
      }
    } catch (error) {
      console.error("Error fetching document subcategories:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to fetch document subcategories: " + error.message,
      });
      return [];
    }
  };

  // Function to fetch document info
  const fetchDocumentInfo = async (docCatId, docSubCatId) => {
    try {
      const token = sessionStorage.getItem("token");
      const userId = sessionStorage.getItem("userid");
      const incUserId = sessionStorage.getItem("incuserid");

      const response = await fetch(
        `${IPAdress}/itelinc/resources/generic/getdocinfo`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userid: userId,
            doccatid: docCatId,
            docsubcatid: docSubCatId,
            userIncId: incUserId || 1,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.statusCode === 200) {
        setDocumentInfo(data.data);
        return data.data;
      } else {
        throw new Error(data.message || "Failed to fetch document info");
      }
    } catch (error) {
      console.error("Error fetching document info:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to fetch document info: " + error.message,
      });
      return [];
    }
  };

  const convertData = (dateStr) => {
    const dateObj = new Date(dateStr);
    const formatted = dateObj.toLocaleDateString("en-GB");
    return formatted;
  };

  // Calculate loading state
  const isLoading =
    adminStartupLoading ||
    dateFilterLoading ||
    (Number(roleid) === 1 && adminviewData && !incubatee);

  // Calculate if data is available
  const hasData = incubatee;

  // Now we can safely use conditional rendering for UI elements
  if (isLoading) {
    return <Spinner />;
  }

  if (!hasData) {
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

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <div>
        {/* Navigation bar */}
        <header className={style.header}>
          <div className={style.container}>
            <div className={style.logoSection}>
              <img src={ITELLogo} className={style.logoIcon} alt="ITEL Logo" />
              <div>
                <h1 className={style.title}>ITEL Incubation Portal</h1>
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
                (Number(roleid) === 7 && adminviewData)) && (
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
                  className={styles.btnPrimary}
                  onClick={() => setIsLogsModalOpen(true)}
                >
                  <FileText className={styles.icon} />
                  Audit Logs
                </button>
              )}

              <AuditLogsModal
                isOpen={isLogsModalOpen}
                onClose={() => setIsLogsModalOpen(false)}
                IPAddress={IPAdress}
                token={token}
                userid={userid}
              />

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

              {/* Always render the modal but control visibility with isOpen prop */}
              <ChangePasswordModal
                isOpen={isChangePasswordOpen && Number(roleid) === 4}
                onClose={() => setIsChangePasswordOpen(false)}
              />

              {/* Contact Modal */}
              <ContactModal
                isOpen={isContactModalOpen}
                onClose={() => setIsContactModalOpen(false)}
                userId={Number(userid)}
                incuserid={incuserid}
              />
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
                      src={
                        incubateeslogopath ? incubateeslogopath : companyLogo
                      }
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
                    <h1 className="text-4xl font-bold mb-2">
                      {incubateesname}
                    </h1>
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
                <div className={styles.cardTitle}>Pending Document Types</div>
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
                <div className={styles.cardTitle}>Overdue Document Types</div>
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
              <h2 className="text-xl font-bold mb-2">
                Document Update Progress
              </h2>
              {Number(roleid) === 4 && (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    className={styles.buttonPrimary}
                    onClick={() => {
                      setSelectedDocument(null);
                      setIsModalOpen(true);
                    }}
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
              <div
                className={`${styles.progressStat} ${styles.progressPending}`}
              >
                <div className={styles.progressDot}></div>
                <div>{pendingDocuments} Pending</div>
              </div>
              <div
                className={`${styles.progressStat} ${styles.progressOverdue}`}
              >
                <div className={styles.progressDot}></div>
                <div>{overdueDocuments} Overdue</div>
              </div>
            </div>
          </div>

          <br />
          <br />

          {/* Documents Table with ReusableDataGrid */}
          <div className={styles.documentsTableFull} style={{ width: "100%" }}>
            {/* Date Range Filter Section */}
            <Box
              sx={{
                display: "flex",
                gap: 2,
                mb: 2,
                mt: 2,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {/* <Typography variant="subtitle2">Filter by Date:</Typography> */}
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(newValue) => {
                  handleDateChange("start", newValue);
                }}
                renderInput={(params) => (
                  <TextField {...params} size="small" sx={{ minWidth: 150 }} />
                )}
              />
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(newValue) => {
                  handleDateChange("end", newValue);
                }}
                renderInput={(params) => (
                  <TextField {...params} size="small" sx={{ minWidth: 150 }} />
                )}
              />
              <Button
                variant="contained"
                onClick={handleApplyDateFilter}
                disabled={!startDate || !endDate || dateFilterLoading}
                sx={{ minWidth: 100 }}
              >
                {dateFilterLoading ? "Loading..." : "Apply"}
              </Button>
              {(startDate || endDate) && (
                <Button
                  variant="outlined"
                  onClick={clearDates}
                  disabled={dateFilterLoading}
                >
                  Clear Dates
                </Button>
              )}
            </Box>

            <div className={styles.resultsInfo}>
              Showing {processedDocuments.length} of {localCompanyDoc.length}{" "}
              documents
              {(startDate || endDate) && (
                <span>
                  {" "}
                  (Filtered by date:{" "}
                  {startDate ? formatDate(startDate) : "Start"} -{" "}
                  {endDate ? formatDate(endDate) : "End"})
                </span>
              )}
            </div>

            {/* ReusableDataGrid Component */}
            <ReusableDataGrid
              data={processedDocuments}
              columns={gridColumns}
              title="Documents"
              dropdownFilters={dropdownFilters}
              enableExport={true}
              enableColumnFilters={true}
              searchPlaceholder="Search documents..."
              searchFields={[
                "doccatname",
                "docsubcatname",
                "documentname",
                "status",
              ]}
              uniqueIdField="id"
              onExportData={customExportData}
              exportConfig={{
                filename: "documents",
                sheetName: "Documents",
              }}
              className={styles.dataGridContainer}
            />
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

          {/* Share Document Modal */}
          <ShareDocumentModal
            isOpen={isShareModalOpen}
            onClose={() => {
              setIsShareModalOpen(false);
              setSelectedDocument(null);
            }}
            document={selectedDocument}
            incubateesname={incubateesname}
            IPAdress={IPAdress}
          />

          {/* Add Document Modal - Always render but control visibility */}
          <DocumentUploadModal
            isModalOpen={isModalOpen && Number(roleid) === 4}
            setIsModalOpen={setIsModalOpen}
            incubateesrecid={incubateesrecid}
            usersrecid={usersrecid}
            onUploadSuccess={handleDocumentUpload}
            incuserid={incuserid}
            documentData={selectedDocument}
          />
        </div>
        <br />
        {/* Always render DocumentsTable but control visibility */}
        <div style={{ display: Number(roleid) === 4 ? "block" : "none" }}>
          <DocumentsTable />
        </div>

        <br />
        <DDIDocumentsTable userRecID={userRecID} />
      </div>
    </LocalizationProvider>
  );
};

export default StartupDashboard;
