import React, { useState, useContext, useEffect, useMemo } from "react";
import styles from "./DocumentTable.module.css";
import { NavLink } from "react-router-dom";
import { DataContext } from "../Components/Datafetching/DataProvider";
import api from "./Datafetching/api";
import Swal from "sweetalert2";
import style from "../Components/StartupDashboard/StartupDashboard.module.css";
import * as XLSX from "xlsx";
import { IPAdress } from "./Datafetching/IPAdrees";
import { Download } from "lucide-react";
import { DataGrid } from "@mui/x-data-grid";
import Paper from "@mui/material/Paper";
import {
  Button,
  Box,
  Typography,
  Modal,
  IconButton,
  Chip,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { styled } from "@mui/material/styles";

// Styled components for custom styling
const StyledPaper = styled(Paper)(({ theme }) => ({
  // height: 500,
  width: "100%",
  marginTop: theme.spacing(2),
}));

const StyledChip = styled(Chip)(({ theme, status }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case "submitted":
        return { backgroundColor: "#d1fae5", color: "#065f46" };
      case "pending":
        return { backgroundColor: "#fef3c7", color: "#92400e" };
      case "overdue":
        return { backgroundColor: "#fee2e2", color: "#991b1b" };
      default:
        return { backgroundColor: "#f3f4f6", color: "#374151" };
    }
  };

  return {
    ...getStatusColor(status),
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

export default function DocumentTable() {
  // ALL HOOKS MUST BE DECLARED AT THE TOP OF THE COMPONENT
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const {
    companyDoc,
    loading,
    fromYear,
    toYear,
    setFromYear,
    setToYear,
    userid,
    roleid,
    setCompanyDoc,
  } = useContext(DataContext);

  const [tempFromYear, setTempFromYear] = useState(fromYear);
  const [tempToYear, setTempToYear] = useState(toYear);
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination state for Material UI
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });

  // Loading state for year filter
  const [yearLoading, setYearLoading] = useState(false);

  // Check if XLSX is available
  const isXLSXAvailable = !!XLSX;

  // Map stage names to filter values
  const getStageFilterValue = (stageName) => {
    if (!stageName) return "";

    const normalizedStage = stageName.toLowerCase().trim();
    switch (normalizedStage) {
      case "pre seed stage":
        return "1";
      case "seed stage":
        return "2";
      case "early stage":
      case "early":
        return "3";
      case "growth stage":
      case "growth":
        return "4";
      case "expansion stage":
      case "expansion":
        return "5";
      default:
        return "";
    }
  };

  // Filter data using useMemo for performance
  const filteredData = useMemo(() => {
    if (!companyDoc) return [];

    return companyDoc.filter((item) => {
      const statusNormalized = (item.status || "").toLowerCase();

      const matchesSearch =
        (item.incubateesname || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (item.documentname || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (item.doccatname || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesStage =
        stageFilter === "all" ||
        (item.incubateesstagelevel &&
          getStageFilterValue(item.incubateesstagelevel) === stageFilter);

      const matchesStatus =
        statusFilter === "all" || statusNormalized === statusFilter;

      return matchesSearch && matchesStage && matchesStatus;
    });
  }, [companyDoc, searchTerm, stageFilter, statusFilter]);

  // Add unique ID to each row if not present
  const rowsWithId = useMemo(() => {
    return filteredData.map((item, index) => ({
      ...item,
      id: item.id || `${item.incubateesname}-${item.documentname}-${index}`,
    }));
  }, [filteredData]);

  const handleViewDocument = async (filepath) => {
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

  // Define columns for DataGrid with proper null checks
  const columns = useMemo(
    () => [
      {
        field: "incubateesname",
        headerName: "Company",
        width: 180,
        sortable: true,
      },
      {
        field: "doccatname",
        headerName: "Document Category",
        width: 180,
        sortable: true,
      },
      {
        field: "docsubcatname",
        headerName: "Document Subcategory",
        width: 180,
        sortable: true,
      },
      {
        field: "documentname",
        headerName: "Document Name",
        width: 200,
        sortable: true,
      },
      ...(Number(roleid) === 1 || Number(roleid) === 3
        ? [
            {
              field: "incubateesstagelevel",
              headerName: "Stage",
              width: 150,
              sortable: true,
              renderCell: (params) => (
                <Chip
                  label={params.value || "Unknown"}
                  size="small"
                  variant="outlined"
                />
              ),
            },
          ]
        : []),
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
        field: "status",
        headerName: "Status",
        width: 120,
        sortable: true,
        renderCell: (params) => {
          if (!params) return <Chip label="Unknown" size="small" />;
          const statusNormalized = (params.value || "").toLowerCase();

          return (
            <StyledChip
              label={params.value || "Unknown"}
              status={statusNormalized}
              size="small"
            />
          );
        },
      },
      {
        field: "collecteddocobsoletestate",
        headerName: "Doc State",
        width: 120,
        sortable: true,
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
        field: "actions",
        headerName: "Actions",
        width: 120,
        sortable: false,
        renderCell: (params) => {
          if (!params || !params.row)
            return (
              <Button
                variant="contained"
                size="small"
                disabled
                sx={{
                  backgroundColor: "#6b7280",
                  color: "white",
                  "&.Mui-disabled": {
                    backgroundColor: "#6b7280",
                    color: "white",
                    opacity: 0.7,
                  },
                }}
              >
                No File
              </Button>
            );

          return params.row.filepath ? (
            <Button
              variant="contained"
              size="small"
              onClick={() => handleViewDocument(params.row.filepath)}
            >
              View Doc
            </Button>
          ) : (
            <Button
              variant="contained"
              size="small"
              disabled
              sx={{
                backgroundColor: "#6b7280",
                color: "white",
                "&.Mui-disabled": {
                  backgroundColor: "#6b7280",
                  color: "white",
                  opacity: 0.7,
                },
              }}
            >
              No File
            </Button>
          );
        },
      },
    ],
    [roleid, handleViewDocument]
  );

  // NOW WE CAN HAVE CONDITIONAL RETURNS AFTER ALL HOOKS
  if (loading) return <p>Loading documents...</p>;

  // Fixed fetchDocumentsByYear function
  const fetchDocumentsByYear = async () => {
    setYearLoading(true);
    try {
      const response = await api.post("/generic/getcollecteddocsdash", {
        userId: Number(roleid) === 1 ? "ALL" : userid,
        startYear: tempFromYear,
        endYear: tempToYear,
      });

      // Handle different response structures
      let responseData;
      if (response.data && Array.isArray(response.data)) {
        responseData = response.data;
      } else if (
        response.data &&
        response.data.data &&
        Array.isArray(response.data.data)
      ) {
        responseData = response.data.data;
      } else if (
        response.data &&
        response.data.result &&
        Array.isArray(response.data.result)
      ) {
        responseData = response.data.result;
      } else {
        console.warn("Unexpected response structure:", response);
        responseData = [];
      }

      setCompanyDoc(responseData);
      setPaginationModel({ ...paginationModel, page: 0 });
      setFromYear(tempFromYear);
      setToYear(tempToYear);
    } catch (err) {
      console.error("Error fetching documents by year:", err);
      setCompanyDoc([]);
      alert(
        `Error fetching documents: ${err.message || "Unknown error occurred"}`
      );
    } finally {
      setYearLoading(false);
    }
  };

  // Export to CSV function
  const exportToCSV = () => {
    // Create a copy of the data for export
    const exportData = filteredData.map((item) => ({
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
      const exportData = filteredData.map((item) => ({
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

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <Typography variant="h5">Incubatee Document Submission</Typography>
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

      {/* Year Filters Section */}
      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <TextField
          label="From Year"
          type="number"
          variant="outlined"
          size="small"
          value={tempFromYear}
          onChange={(e) => setTempFromYear(e.target.value)}
          sx={{ minWidth: 120 }}
        />
        <TextField
          label="To Year"
          type="number"
          variant="outlined"
          size="small"
          value={tempToYear}
          onChange={(e) => setTempToYear(e.target.value)}
          sx={{ minWidth: 120 }}
        />
        <Button
          variant="contained"
          onClick={fetchDocumentsByYear}
          disabled={yearLoading}
          sx={{ minWidth: 100 }}
        >
          {yearLoading ? "Loading..." : "Apply"}
        </Button>
      </Box>

      {/* Filters Section */}
      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <TextField
          label="Search companies or documents..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ minWidth: 250 }}
        />

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="stage-filter-label">Stage</InputLabel>
          <Select
            labelId="stage-filter-label"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            label="Stage"
          >
            <MenuItem value="all">All Stages</MenuItem>
            <MenuItem value="1">Pre Seed</MenuItem>
            <MenuItem value="2">Seed Stage</MenuItem>
            <MenuItem value="3">Early Stage</MenuItem>
            <MenuItem value="4">Growth Stage</MenuItem>
            <MenuItem value="5">Expansion Stage</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="status-filter-label">Status</InputLabel>
          <Select
            labelId="status-filter-label"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Status"
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="submitted">Submitted</MenuItem>
            <MenuItem value="overdue">Overdue</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="items-per-page-label">Items per page</InputLabel>
          <Select
            labelId="items-per-page-label"
            value={paginationModel.pageSize}
            onChange={(e) =>
              setPaginationModel({
                ...paginationModel,
                pageSize: Number(e.target.value),
                page: 0,
              })
            }
            label="Items per page"
          >
            <MenuItem value={5}>5 per page</MenuItem>
            <MenuItem value={10}>10 per page</MenuItem>
            <MenuItem value={20}>20 per page</MenuItem>
            <MenuItem value={50}>50 per page</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Results Info */}
      <Box sx={{ mb: 1, color: "text.secondary" }}>
        Showing {paginationModel.page * paginationModel.pageSize + 1} to{" "}
        {Math.min(
          (paginationModel.page + 1) * paginationModel.pageSize,
          filteredData.length
        )}{" "}
        of {filteredData.length} entries
        {stageFilter !== "all" && (
          <span>
            {" "}
            (Filtered by stage:{" "}
            {stageFilter === "1"
              ? "Pre Seed Stage"
              : stageFilter === "2"
              ? "Seed Stage"
              : stageFilter === "3"
              ? "Early Stage"
              : stageFilter === "4"
              ? "Growth Stage"
              : stageFilter === "5"
              ? "Expansion Stage"
              : "All Stages"}
            )
          </span>
        )}
      </Box>

      {/* Material UI DataGrid */}
      <StyledPaper>
        <DataGrid
          rows={rowsWithId}
          columns={columns}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[5, 10, 20, 50]}
          checkboxSelection
          disableRowSelectionOnClick
          sx={{ border: 0 }}
          loading={yearLoading}
          getRowClassName={(params) => {
            if (!params || !params.row) return "";
            const statusNormalized = (params.row.status || "").toLowerCase();
            if (statusNormalized === "overdue") return styles.overdueRow;
            if (statusNormalized === "pending") return styles.pendingRow;
            return "";
          }}
        />
      </StyledPaper>

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
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
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

      {filteredData.length === 0 && !yearLoading && (
        <Box sx={{ textAlign: "center", py: 3, color: "text.secondary" }}>
          No documents found matching your criteria.
          {stageFilter !== "all" && (
            <div>Try changing the stage filter or search term.</div>
          )}
        </Box>
      )}
    </div>
  );
}
