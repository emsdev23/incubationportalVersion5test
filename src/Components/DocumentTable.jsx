import React, {
  useState,
  useEffect,
  useContext,
  useMemo,
  useCallback,
} from "react";
import { DataContext } from "../Components/Datafetching/DataProvider";
import Swal from "sweetalert2";
import { IPAdress } from "./Datafetching/IPAdrees";
import ReusableDataGrid from "../Components/Datafetching/ReusableDataGrid";
import styles from "./DocumentTable.module.css";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  Box,
  Typography,
  Modal,
  IconButton,
  Button,
  TextField,
  Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

// Common date formatting function
const formatDate = (dateInput) => {
  if (!dateInput) return "-";

  try {
    if (dateInput instanceof Date) {
      return dateInput.toLocaleDateString();
    }

    const formattedDate = dateInput.endsWith("Z")
      ? `${dateInput.slice(0, -1)}T00:00:00Z`
      : dateInput;

    return new Date(formattedDate).toLocaleDateString();
  } catch (error) {
    console.error("Error parsing date:", error);
    return String(dateInput);
  }
};

// Format date for API (YYYY-MM-DD)
const formatDateForAPI = (date) => {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
};

export default function DocumentTable() {
  const {
    companyDoc,
    loading,
    roleid,
    fetchDocumentsByDateRange,
    dateFilterLoading,
    incuserid,
    userid,
    // Add these from the context
    fromYear,
    setFromYear,
    toYear,
    setToYear,
  } = useContext(DataContext);

  // Preview Modal States
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Add state variables to store the initial values
  const [initialFromDate, setInitialFromDate] = useState(null);
  const [initialToDate, setInitialToDate] = useState(null);

  // Date Filter States - update to use context values
  const [startDate, setStartDate] = useState(
    fromYear ? new Date(fromYear) : null
  );
  const [endDate, setEndDate] = useState(toYear ? new Date(toYear) : null);
  const [datesSelected, setDatesSelected] = useState(!!(fromYear && toYear));

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

  // Handle date change
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

  // Handle apply date filter
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
  }, [startDate, endDate, setFromYear, setToYear, fetchDocumentsByDateRange]);

  // Handle clear dates - FIXED VERSION
  const handleClearDates = useCallback(() => {
    // Reset to the initial values stored from the context
    setStartDate(initialFromDate ? new Date(initialFromDate) : null);
    setEndDate(initialToDate ? new Date(initialToDate) : null);
    setDatesSelected(!!(initialFromDate && initialToDate));

    // Reset the context state to the initial values
    setFromYear(initialFromDate);
    setToYear(initialToDate);

    // Fetch the data using the initial date values
    fetchDocumentsByDateRange(initialFromDate, initialToDate);
  }, [
    initialFromDate,
    initialToDate,
    setFromYear,
    setToYear,
    fetchDocumentsByDateRange,
  ]);

  // Stage name to value mapping
  const stageMapping = {
    "pre seed stage": "1",
    "seed stage": "2",
    "early stage": "3",
    early: "3",
    "growth stage": "4",
    growth: "4",
    "expansion stage": "5",
    expansion: "5",
  };

  // Status colors with proper mapping
  const statusColors = {
    submitted: { backgroundColor: "#d1fae5", color: "#065f46" },
    pending: { backgroundColor: "#fef3c7", color: "#92400e" },
    overdue: { backgroundColor: "#fee2e2", color: "#991b1b" },
  };

  // Stage colors mapping
  const stageColors = {
    "pre seed stage": { backgroundColor: "#e0e7ff", color: "#4338ca" },
    "seed stage": { backgroundColor: "#dbeafe", color: "#1e40af" },
    "early stage": { backgroundColor: "#d1fae5", color: "#065f46" },
    early: { backgroundColor: "#d1fae5", color: "#065f46" },
    "growth stage": { backgroundColor: "#fef3c7", color: "#92400e" },
    growth: { backgroundColor: "#fef3c7", color: "#92400e" },
    "expansion stage": { backgroundColor: "#ede9fe", color: "#5b21b6" },
    expansion: { backgroundColor: "#ede9fe", color: "#5b21b6" },
  };

  // Transform data with mapped stage values for filtering
  const documentsWithMappedData = useMemo(() => {
    if (!companyDoc) return [];

    return companyDoc.map((doc, index) => {
      const normalizedStage = (doc.incubateesstagelevel || "")
        .toLowerCase()
        .trim();
      const normalizedStatus = (doc.status || "").toLowerCase().trim();

      return {
        ...doc,
        _uid:
          doc.collecteddocrecid ||
          doc.documentrecid ||
          doc.id ||
          `${doc.incubateesname}-${doc.documentname}-${doc.doccatname}-${index}`,
        // Add mapped values for filtering
        _stageValue: stageMapping[normalizedStage] || "",
        _statusValue: normalizedStatus,
      };
    });
  }, [companyDoc]);

  // Helper function to download file with proper name
  const downloadFile = async (fileUrl, documentName, originalFilepath) => {
    try {
      const response = await fetch(fileUrl, { mode: "cors" });
      const blob = await response.blob();

      const fileExtension = originalFilepath.split(".").pop().toLowerCase();

      const now = new Date();
      const timestamp = `${now.getFullYear()}/${String(
        now.getMonth() + 1
      ).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")} ${String(
        now.getHours()
      ).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(
        now.getSeconds()
      ).padStart(2, "0")}`;

      const newFileName = `${documentName}_${timestamp}.${fileExtension}`;

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = newFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Error downloading file:", err);
      Swal.fire({
        icon: "error",
        title: "Download Failed",
        text: "Unable to download file. Please try again.",
      });
    }
  };

  // Handle viewing document
  const handleViewDocument = async (filepath, documentName) => {
    try {
      const token = sessionStorage.getItem("token");

      const response = await fetch(
        `${IPAdress}/itelinc/resources/generic/getfileurl`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            userid: userid || "1",
            "X-Module": "DDI Documents",
            "X-Action": "DDI Document preview",
          },
          body: JSON.stringify({
            userid: userid,
            incUserid: incuserid,
            url: filepath,
          }),
        }
      );

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

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
              downloadFile(fileUrl, documentName, filepath);
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

  // Define columns
  const columns = [
    {
      field: "incubateesname",
      headerName: "Company",
      width: 180,
      sortable: true,
      filterable: true,
    },
    {
      field: "doccatname",
      headerName: "Document Category",
      width: 180,
      sortable: true,
      filterable: true,
    },
    {
      field: "docsubcatname",
      headerName: "Document Subcategory",
      width: 180,
      sortable: true,
      filterable: true,
    },
    {
      field: "documentname",
      headerName: "Document Name",
      width: 200,
      sortable: true,
      filterable: true,
    },
    {
      field: "periodidentifier",
      headerName: "Period Identifier",
      width: 180,
      sortable: true,
      filterable: true,
      renderCell: (params) => {
        // If the value is null, undefined, or an empty string, return a hyphen
        // Otherwise, return the actual value
        return params.value || "-";
      },
    },
  ];

  // Conditionally add Stage column based on role
  if ([1, 3].includes(Number(roleid))) {
    columns.push({
      field: "incubateesstagelevel",
      headerName: "Stage",
      width: 150,
      sortable: true,
      filterable: true,
      renderCell: (params) => {
        const stageName = params.value || "Unknown";
        const normalizedStage = stageName.toLowerCase().trim();
        const stageColor = stageColors[normalizedStage] || {
          backgroundColor: "#f3f4f6",
          color: "#374151",
        };

        return (
          <Chip
            label={stageName}
            size="small"
            sx={{
              backgroundColor: stageColor.backgroundColor,
              color: stageColor.color,
              fontWeight: 500,
              borderRadius: 1,
            }}
          />
        );
      },
    });
  }

  // Add remaining columns
  columns.push(
    {
      field: "submission_date",
      headerName: "Submission Date",
      width: 150,
      sortable: true,
      filterable: true,
      type: "date",
      renderCell: (params) => {
        if (!params?.row) return "Not submitted";
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
      filterable: true,
      type: "date",
      renderCell: (params) => {
        if (!params?.row) return <Box>-</Box>;
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
    // Remove the type: "chip" property from the status column
    {
      field: "status",
      headerName: "Status",
      width: 120,
      sortable: true,
      filterable: true,
      // Remove this line: type: "chip",
      // Remove this line: chipColors: statusColors,
      renderCell: (params) => {
        if (!params) return <Chip label="Unknown" size="small" />;
        const statusValue = params.value || "Unknown";
        const statusNormalized = statusValue.toLowerCase();
        const customColor = statusColors[statusNormalized] || {
          backgroundColor: "#f3f4f6",
          color: "#374151",
        };

        return (
          <Chip
            label={statusValue}
            size="small"
            sx={{
              backgroundColor: customColor.backgroundColor,
              color: customColor.color,
              fontWeight: 500,
              borderRadius: 1,
            }}
          />
        );
      },
    },
    {
      field: "collecteddocobsoletestate",
      headerName: "Doc State",
      width: 120,
      sortable: true,
      filterable: true,
      renderCell: (params) => {
        if (!params) return <span>---</span>;
        return params.value ? (
          <Chip
            label={params.value}
            size="small"
            sx={{
              backgroundColor: "#ff8787",
              color: "#c92a2a",
              fontWeight: "600",
            }}
          />
        ) : (
          <span>---</span>
        );
      },
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
      headerName: " Document Template",
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
    }
  );

  // Define dropdown filters - use mapped values
  const dropdownFilters = [
    {
      field: "_stageValue", // Use mapped stage value for filtering
      label: "Stage",
      width: 150,
      options: [
        { value: "1", label: "Pre Seed" },
        { value: "2", label: "Seed Stage" },
        { value: "3", label: "Early Stage" },
        { value: "4", label: "Growth Stage" },
        { value: "5", label: "Expansion Stage" },
      ],
    },
    {
      field: "_statusValue", // Use normalized status for filtering
      label: "Status",
      width: 150,
      options: [
        { value: "pending", label: "Pending" },
        { value: "submitted", label: "Submitted" },
        { value: "overdue", label: "Overdue" },
      ],
    },
  ];

  // Custom export data formatter
  const handleExportData = (data) => {
    return data.map((item) => ({
      "Company Name": item.incubateesname || "",
      "Document Category": item.doccatname || "",
      "Document Subcategory": item.docsubcatname || "",
      "Document Name": item.documentname || "",
      Stage: item.incubateesstagelevel || "",
      "Submission Date": item.submission_date
        ? formatDate(item.submission_date)
        : "Not submitted",
      "Due Date": formatDate(item.due_date),
      Status: item.status || "",
      "Document State": item.collecteddocobsoletestate || "---",
      "Template Document Name": item.documenttemplatedocname || "",
      "Sample Document": item.documentsampledoc || "",
    }));
  };

  if (loading) return <p>Loading documents...</p>;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <div className={styles.card}>
        {/* Date Range Filter Section - Custom UI above the table */}
        <Box
          sx={{
            display: "flex",
            gap: 2,
            mb: 2,
            flexWrap: "wrap",
            alignItems: "center",
            p: 2,
            backgroundColor: "#f8f9fa",
            borderRadius: 1,
            border: "1px solid #e0e0e0",
          }}
        >
          {/* <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            📅 Filter by Due Date:
          </Typography> */}
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
              onClick={handleClearDates}
              sx={{ minWidth: 100 }}
            >
              Clear Dates
            </Button>
          )}
        </Box>

        <div className={styles.resultsInfo} style={{ textAlign: "center" }}>
          Showing {documentsWithMappedData.length} of {companyDoc?.length || 0}{" "}
          documents
          {(startDate || endDate) && (
            <span>
              {" "}
              (Filtered by date: {startDate
                ? formatDate(startDate)
                : "Start"} - {endDate ? formatDate(endDate) : "End"})
            </span>
          )}
        </div>

        {/* Reusable DataGrid */}
        <ReusableDataGrid
          data={documentsWithMappedData}
          columns={columns}
          title="Incubatee Document Submission"
          dropdownFilters={dropdownFilters}
          searchPlaceholder="Search companies or documents..."
          searchFields={["incubateesname", "documentname", "doccatname"]}
          uniqueIdField="_uid"
          enableExport={true}
          onExportData={handleExportData}
          exportConfig={{
            filename: "documents",
            sheetName: "Documents",
          }}
          enableColumnFilters={true}
        />

        {/* Additional Info Display */}
        {/* {(startDate || endDate) && (
          <Box
            sx={{
              mt: 2,
              p: 2,
              backgroundColor: "#e3f2fd",
              borderRadius: 1,
              border: "1px solid #90caf9",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              📊 Currently filtered by date range:{" "}
              <strong>
                {startDate ? formatDate(startDate) : "Start"} -{" "}
                {endDate ? formatDate(endDate) : "End"}
              </strong>
            </Typography>
          </Box>
        )} */}

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
              height: "80%",
              bgcolor: "background.paper",
              boxShadow: 24,
              p: 4,
              display: "flex",
              flexDirection: "column",
              borderRadius: 2,
            }}
          >
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}
            >
              <Typography variant="h6">Document Preview</Typography>
              <IconButton onClick={() => setIsPreviewOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
            <Box sx={{ flexGrow: 1, overflow: "hidden" }}>
              <iframe
                src={previewUrl}
                title="Document Preview"
                width="100%"
                height="100%"
                style={{ border: "none" }}
              />
            </Box>
          </Box>
        </Modal>
      </div>
    </LocalizationProvider>
  );
}
