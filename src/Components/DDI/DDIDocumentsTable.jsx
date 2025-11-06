import React, { useState, useContext, useEffect, useMemo } from "react";
import styles from "../CompanyTable.module.css";
import api from "../Datafetching/api";
import Swal from "sweetalert2";
import style from "../StartupDashboard/StartupDashboard.module.css";
import * as XLSX from "xlsx";
import { IPAdress } from "../Datafetching/IPAdrees";
import { Download, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DataContext } from "../Datafetching/DataProvider";

// Material UI imports
import { DataGrid } from "@mui/x-data-grid";
import Paper from "@mui/material/Paper";
import {
  Button,
  Box,
  Typography,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  IconButton,
  Modal,
  CircularProgress,
} from "@mui/material";
import { styled } from "@mui/material/styles";

// Styled components for custom styling
const StyledPaper = styled(Paper)(({ theme }) => ({
  width: "100%",
  marginBottom: theme.spacing(2),
}));

const StyledChip = styled(Chip)(({ theme, stage }) => {
  const getStageColor = (stage) => {
    switch (stage) {
      case 1:
        return { backgroundColor: "#e0e7ff", color: "#4338ca" }; // Pre Seed
      case 2:
        return { backgroundColor: "#dbeafe", color: "#1e40af" }; // Seed
      case 3:
        return { backgroundColor: "#d1fae5", color: "#065f46" }; // Early
      case 4:
        return { backgroundColor: "#fef3c7", color: "#92400e" }; // Growth
      case 5:
        return { backgroundColor: "#ede9fe", color: "#5b21b6" }; // Expansion
      default:
        return { backgroundColor: "#f3f4f6", color: "#374151" };
    }
  };

  return {
    ...getStageColor(stage),
    fontWeight: 500,
    borderRadius: 4,
  };
});

const VisibilityButton = styled(Button)(({ theme, visible }) => ({
  padding: "0.4rem 0.8rem",
  borderRadius: "0.3rem",
  border: "none",
  cursor: "pointer",
  fontWeight: "500",
  fontSize: "0.875rem",
  transition: "all 0.2s",
  backgroundColor: visible ? "#10b981" : "#ef4444",
  color: "#fff",
  "&:hover": {
    backgroundColor: visible ? "#059669" : "#dc2626",
  },
}));

// Common date formatting function
const formatDate = (dateString) => {
  if (!dateString) return "-";

  try {
    return new Date(dateString).toLocaleDateString();
  } catch (error) {
    console.error("Error parsing date:", error);
    return dateString;
  }
};

export default function DDIDocumentsTable({ userRecID = "ALL" }) {
  const navigate = useNavigate();
  const { roleid, incuserid, userid } = useContext(DataContext);

  const usersrecid = roleid === 7 ? "ALL" : userRecID;
  console.log("User Rec ID:", usersrecid);
  console.log(userRecID);

  // Condition check to visibility state
  const isAdminRole =
    Number(roleid) === 1 || Number(roleid) === 3 || Number(roleid) === 7;
  const isStartupDashboard = location.pathname === "/startup/Dashboard";
  const shouldShowVisibilityColumn = isAdminRole && !isStartupDashboard;

  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasFetchedData, setHasFetchedData] = useState(false);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [togglingDoc, setTogglingDoc] = useState(null);

  // Pagination state for Material UI
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });

  // Check if XLSX is available
  const isXLSXAvailable = !!XLSX;

  // Fetch DDI Documents from API
  useEffect(() => {
    const fetchDDIDocuments = async () => {
      try {
        setLoading(true);
        setError("");
        setHasFetchedData(false);

        const response = await api.post(
          "/generic/getddidocs",
          { userId: usersrecid, incUserId: incuserid },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (response.data?.statusCode === 200) {
          // Normalize API data so visibility is consistent
          const normalized = response.data.data.map((doc) => ({
            ...doc,
            ddidocumentsvisibility: doc.ddidocumentsvisibilitystate,
          }));
          setDocuments(normalized);
          setHasFetchedData(true);
        } else {
          if (
            response.data?.statusCode === 404 ||
            (response.data?.message &&
              response.data.message.toLowerCase().includes("no documents"))
          ) {
            setDocuments([]);
            setHasFetchedData(true);
          } else {
            setError(response.data?.message || "Failed to fetch documents");
          }
        }
      } catch (error) {
        console.error("Error fetching DDI documents:", error);
        if (error.response && error.response.status === 404) {
          setDocuments([]);
          setHasFetchedData(true);
        } else {
          setError("Error fetching documents. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDDIDocuments();
  }, [usersrecid, incuserid]);

  // Unique Companies for filter
  const uniqueCompanies = useMemo(() => {
    return Array.from(
      new Map(documents.map((doc) => [doc.incubateesname, doc])).values()
    );
  }, [documents]);

  // Filter data using useMemo for performance
  const filteredData = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        (doc.incubateesname || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (doc.ddidocumentsname || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (doc.uploadedbyname || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesStage =
        stageFilter === "all" ||
        (doc.ddidocumentsstartupstagesrecid &&
          doc.ddidocumentsstartupstagesrecid === Number(stageFilter));

      const matchesCompany =
        companyFilter === "all" || doc.incubateesname === companyFilter;

      return matchesSearch && matchesStage && matchesCompany;
    });
  }, [documents, searchTerm, stageFilter, companyFilter]);

  // Add unique ID to each row if not present
  const rowsWithId = useMemo(() => {
    return filteredData.map((item) => ({
      ...item,
      id: item.ddidocumentsrecid || Math.random().toString(36).substr(2, 9),
    }));
  }, [filteredData]);

  // Define columns for DataGrid
  const columns = [
    {
      field: "ddidocumentsname",
      headerName: "Document Name",
      width: 250,
      sortable: true,
      renderCell: (params) => {
        return (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <span style={{ marginRight: "8px" }}>📄</span>
            {params.value}
          </Box>
        );
      },
    },
    {
      field: "incubateesname",
      headerName: "Company",
      width: 200,
      sortable: true,
    },
    {
      field: "startupstagesname",
      headerName: "Stage",
      width: 150,
      sortable: true,
      renderCell: (params) => {
        if (!params || !params.row)
          return <StyledChip label="—" size="small" />;
        return (
          <StyledChip
            label={params.row.startupstagesname || "—"}
            size="small"
            stage={params.row.ddidocumentsstartupstagesrecid}
          />
        );
      },
    },
    {
      field: "uploadedbyname",
      headerName: "Uploaded By",
      width: 180,
      sortable: true,
    },
    {
      field: "ddidocumentscreatedtime",
      headerName: "Upload Date",
      width: 150,
      sortable: true,
      renderCell: (params) => {
        if (!params || !params.row) return "-";
        return formatDate(params.row.ddidocumentscreatedtime);
      },
    },
    ...(shouldShowVisibilityColumn
      ? [
          {
            field: "ddidocumentsvisibility",
            headerName: "Incubatee Visibility",
            width: 180,
            sortable: true,
            renderCell: (params) => {
              if (!params || !params.row) return null;
              return (
                <VisibilityButton
                  visible={params.row.ddidocumentsvisibility === 1}
                  disabled={togglingDoc === params.row.ddidocumentsrecid}
                >
                  {params.row.ddidocumentsvisibility === 1 ? "OK" : "NO"}
                </VisibilityButton>
              );
            },
          },
        ]
      : []),
    {
      field: "actions",
      headerName: "Actions",
      width: 150,
      sortable: false,
      renderCell: (params) => {
        if (!params || !params.row) return null;
        return (
          <Button
            variant="contained"
            size="small"
            onClick={() =>
              handleViewDocument(
                params.row.ddidocumentsfilepath,
                params.row.ddidocumentsname
              )
            }
          >
            View Document
          </Button>
        );
      },
    },
  ];

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

  // View/Download Document
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

  // Export to CSV function
  const exportToCSV = () => {
    const exportData = filteredData.map((item) => ({
      "Document Name": item.ddidocumentsname || "",
      Company: item.incubateesname || "",
      Stage: item.startupstagesname || "",
      "Uploaded By": item.uploadedbyname || "",
      "Upload Date": formatDate(item.ddidocumentscreatedtime),
      Visibility: item.ddidocumentsvisibility === 1 ? "Enabled" : "Disabled",
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
      `ddi_documents_${new Date().toISOString().slice(0, 10)}.csv`
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
      const exportData = filteredData.map((item) => ({
        "Document Name": item.ddidocumentsname || "",
        Company: item.incubateesname || "",
        Stage: item.startupstagesname || "",
        "Uploaded By": item.uploadedbyname || "",
        "Upload Date": formatDate(item.ddidocumentscreatedtime),
        Visibility: item.ddidocumentsvisibility === 1 ? "Enabled" : "Disabled",
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, "DDI Documents");
      XLSX.writeFile(
        wb,
        `ddi_documents_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Error exporting to Excel. Falling back to CSV export.");
      exportToCSV();
    }
  };

  // Loading & Error states
  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>DDI Documents</h2>
        </div>
        <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
          <CircularProgress />
        </Box>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>DDI Documents</h2>
        </div>
        <Box sx={{ p: 2, color: "error.main" }}>{error}</Box>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <Typography variant="h5">Due Diligence Document Submission</Typography>
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

      {/* Filters Section */}
      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <TextField
          label="Search documents, companies, or uploaders..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ minWidth: 300 }}
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

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="company-filter-label">Company</InputLabel>
          <Select
            labelId="company-filter-label"
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            label="Company"
          >
            <MenuItem value="all">All Companies</MenuItem>
            {uniqueCompanies.map((company, index) => (
              <MenuItem key={index} value={company.incubateesname}>
                {company.incubateesname}
              </MenuItem>
            ))}
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
            <MenuItem value={25}>25 per page</MenuItem>
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
        of {filteredData.length} documents
      </Box>

      {/* Material UI DataGrid */}
      <StyledPaper>
        <DataGrid
          rows={rowsWithId}
          columns={columns}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[5, 10, 25, 50]}
          disableRowSelectionOnClick
          sx={{ border: 0 }}
          autoHeight
        />
      </StyledPaper>

      {hasFetchedData && documents.length === 0 && (
        <Box sx={{ textAlign: "center", py: 3, color: "text.secondary" }}>
          No documents uploaded
        </Box>
      )}

      {hasFetchedData && documents.length > 0 && filteredData.length === 0 && (
        <Box sx={{ textAlign: "center", py: 3, color: "text.secondary" }}>
          No documents found matching your criteria.
        </Box>
      )}

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
            maxHeight: "90vh",
            overflow: "auto",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
            <IconButton onClick={() => setIsPreviewOpen(false)}>
              <span style={{ fontSize: "24px" }}>✖</span>
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
    </div>
  );
}
