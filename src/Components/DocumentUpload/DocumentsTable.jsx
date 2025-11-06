import React, {
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from "react";
import Swal from "sweetalert2";
import { IPAdress } from "../Datafetching/IPAdrees";
import * as XLSX from "xlsx";
import { Download } from "lucide-react";

// Material UI imports
import { DataGrid } from "@mui/x-data-grid";
import Paper from "@mui/material/Paper";
import {
  Button,
  Box,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  CircularProgress,
  Backdrop,
  Snackbar,
  Alert,
  Grid,
  Tooltip,
  LinearProgress,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import VisibilityIcon from "@mui/icons-material/Visibility";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import DescriptionIcon from "@mui/icons-material/Description";
import ArticleIcon from "@mui/icons-material/Article";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";

// Styled components
const StyledPaper = styled(Paper)(({ theme }) => ({
  height: 600,
  width: "100%",
  marginBottom: theme.spacing(2),
}));

const StyledBackdrop = styled(Backdrop)(({ theme }) => ({
  zIndex: theme.zIndex.drawer + 1,
  color: "#fff",
}));

const ActionButton = styled(IconButton)(({ theme, color }) => ({
  margin: theme.spacing(0.5),
  backgroundColor:
    color === "edit" ? theme.palette.primary.main : theme.palette.error.main,
  color: "white",
  "&:hover": {
    backgroundColor:
      color === "edit" ? theme.palette.primary.dark : theme.palette.error.dark,
  },
}));

const FileUploadButton = styled(Button)(({ theme }) => ({
  position: "relative",
  overflow: "hidden",
  "& input[type=file]": {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: "100%",
    minHeight: "100%",
    fontSize: "100px",
    textAlign: "right",
    cursor: "pointer",
    opacity: 0,
    outline: "none",
    background: "white",
    display: "block",
  },
}));

const FileIcon = ({ fileName }) => {
  if (!fileName) return <InsertDriveFileIcon />;

  const extension = fileName.split(".").pop().toLowerCase();

  switch (extension) {
    case "pdf":
      return <PictureAsPdfIcon sx={{ color: "#dc2626" }} />;
    case "doc":
    case "docx":
      return <DescriptionIcon sx={{ color: "#2563eb" }} />;
    case "xls":
    case "xlsx":
      return <ArticleIcon sx={{ color: "#16a34a" }} />;
    default:
      return <InsertDriveFileIcon sx={{ color: "#6b7280" }} />;
  }
};

// Common date formatting function
// Common date formatting function
const formatDate = (dateStr) => {
  if (!dateStr) return "-";

  try {
    // Handle array format [year, month, day, hour, minute, second]
    if (Array.isArray(dateStr) && dateStr.length >= 6) {
      const [year, month, day, hour, minute, second] = dateStr;
      // Create a date object (month is 0-indexed in JavaScript Date)
      const date = new Date(year, month - 1, day, hour, minute, second);

      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }

    // Handle YYYYMMDDHHMMSS format (e.g., "2025919124643")
    if (
      typeof dateStr === "string" &&
      dateStr.length === 14 &&
      /^\d+$/.test(dateStr)
    ) {
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      const hour = dateStr.substring(8, 10);
      const minute = dateStr.substring(10, 12);
      const second = dateStr.substring(12, 14);

      // Create a date object in YYYY-MM-DDTHH:MM:SS format
      const isoDateStr = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
      const date = new Date(isoDateStr);

      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    }

    // Handle date strings with question mark (e.g., "Sep 19, 2025, 12:46:43?PM")
    const normalizedDate = dateStr.replace("?", " ");
    const date = new Date(normalizedDate);

    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateStr; // Return original if error
  }
};
// Using forwardRef to allow parent components to access methods
const DocumentsTable = forwardRef(({ title = "📄 Documents" }, ref) => {
  const userId = sessionStorage.getItem("userid");
  const token = sessionStorage.getItem("token");
  const roleid = sessionStorage.getItem("roleid");
  const incUserid = sessionStorage.getItem("incuserid");
  const IP = IPAdress;

  const [documents, setDocuments] = useState([]);
  const [cats, setCats] = useState([]);
  const [subcats, setSubcats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewContent, setPreviewContent] = useState(null);
  const [editDoc, setEditDoc] = useState(null);
  const [formData, setFormData] = useState({
    documentname: "",
    documentdescription: "",
    documentcatrecid: "",
    documentsubcatrecid: "",
    documentperiodicityrecid: "",
    documentremarks: "",
    sampleDocName: "",
    sampleDocBase64: "",
    templateDocName: "",
    templateDocBase64: "",
  });
  const [originalFileNames, setOriginalFileNames] = useState({
    sample: "",
    template: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isUploading, setIsUploading] = useState({
    sample: false,
    template: false,
  });
  const [isDeleting, setIsDeleting] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Pagination state for Material UI
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });

  // Check if XLSX is available
  const isXLSXAvailable = !!XLSX;

  // Expose the openAddModal function to parent components
  useImperativeHandle(ref, () => ({
    openAddModal,
  }));

  // Fetch documents
  const fetchDocuments = () => {
    const url = `${IP}/itelinc/api/documents/getDocumentsAll?incuserid=${encodeURIComponent(
      incUserid
    )}`;
    setLoading(true);
    fetch(url, {
      method: "GET",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.json())
      .then((data) => {
        setDocuments(data.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching documents:", err);
        setToast({
          open: true,
          message: "Failed to load documents. Please try again.",
          severity: "error",
        });
        setLoading(false);
      });
  };

  // Fetch categories independently
  const fetchCategories = () => {
    const url = `${IP}/itelinc/getDoccatAll?incuserid=${encodeURIComponent(
      incUserid
    )}`;
    fetch(url, {
      method: "GET",
      mode: "cors",
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Categories data:", data);
        setCats(data.data || []);
      })
      .catch((err) => {
        console.error("Error fetching categories:", err);
      });
  };

  // Fetch subcategories independently
  const fetchSubCategories = () => {
    const url = `${IP}/itelinc/getDocsubcatAll?incuserid=${encodeURIComponent(
      incUserid
    )}`;
    fetch(url, {
      method: "GET",
      mode: "cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Subcategories data:", data);
        if (data && data.data && Array.isArray(data.data)) {
          setSubcats(data.data);
        } else if (data && Array.isArray(data)) {
          setSubcats(data);
        } else {
          console.warn("Unexpected subcategories data structure:", data);
          setSubcats([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching subcategories:", err);
        setSubcats([]);
      });
  };

  // Refresh all data
  const refreshData = () => {
    fetchDocuments();
    fetchCategories();
    fetchSubCategories();
  };

  // Refresh just dropdown data
  const refreshDropdownData = () => {
    fetchCategories();
    fetchSubCategories();
  };

  // Toast notification
  const showToast = (message, severity = "success") => {
    setToast({ open: true, message, severity });
  };

  // Field validation
  const validateField = (name, value) => {
    const errors = { ...fieldErrors };

    switch (name) {
      case "documentname":
        if (!value || value.trim() === "") {
          errors[name] = "Document name is required";
        } else if (value.length < 3) {
          errors[name] = "Document name must be at least 3 characters";
        } else if (value.length > 100) {
          errors[name] = "Document name must be less than 100 characters";
        } else {
          delete errors[name];
        }
        break;

      case "documentdescription":
        if (!value || value.trim() === "") {
          errors[name] = "Description is required";
        } else if (value.length < 10) {
          errors[name] = "Description must be at least 10 characters";
        } else if (value.length > 500) {
          errors[name] = "Description must be less than 500 characters";
        } else {
          delete errors[name];
        }
        break;

      case "documentcatrecid":
        if (!value) {
          errors[name] = "Please select a category";
        } else {
          delete errors[name];
        }
        break;

      case "documentsubcatrecid":
        if (!value) {
          errors[name] = "Please select a subcategory";
        } else {
          delete errors[name];
        }
        break;

      case "documentperiodicityrecid":
        if (!value) {
          errors[name] = "Please select periodicity";
        } else {
          delete errors[name];
        }
        break;

      default:
        break;
    }

    setFieldErrors(errors);
    return !errors[name];
  };

  // Validate entire form
  const validateForm = () => {
    const isValid =
      validateField("documentname", formData.documentname) &&
      validateField("documentdescription", formData.documentdescription) &&
      validateField("documentcatrecid", formData.documentcatrecid) &&
      validateField("documentsubcatrecid", formData.documentsubcatrecid) &&
      validateField(
        "documentperiodicityrecid",
        formData.documentperiodicityrecid
      );

    return isValid;
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Export to CSV function
  const exportToCSV = () => {
    // Create a copy of the data for export
    const exportData = documents.map((doc, index) => ({
      "S.No": index + 1,
      Category: doc.doccatname || "",
      Subcategory: doc.docsubcatname || "",
      "Document Name": doc.documentname || "",
      Description: doc.documentdescription || "",
      Periodicity: doc.docperiodicityname || "",
      Remarks: doc.documentremarks || "",
      "Sample Document": doc.documentsampledocname || "",
      "Template Document": doc.documenttemplatedocname || "",
      "Created By": isNaN(doc.documentcreatedby)
        ? doc.documentcreatedby
        : "Admin",
      "Created Time": formatDate(doc.documentcreatedtime),
      "Modified By": isNaN(doc.documentmodifiedby)
        ? doc.documentmodifiedby
        : "Admin",
      "Modified Time": formatDate(doc.documentmodifiedtime),
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
      const exportData = documents.map((doc, index) => ({
        "S.No": index + 1,
        Category: doc.doccatname || "",
        Subcategory: doc.docsubcatname || "",
        "Document Name": doc.documentname || "",
        Description: doc.documentdescription || "",
        Periodicity: doc.docperiodicityname || "",
        Remarks: doc.documentremarks || "",
        "Sample Document": doc.documentsampledocname || "",
        "Template Document": doc.documenttemplatedocname || "",
        "Created By": isNaN(doc.documentcreatedby)
          ? doc.documentcreatedby
          : "Admin",
        "Created Time": formatDate(doc.documentcreatedtime),
        "Modified By": isNaN(doc.documentmodifiedby)
          ? doc.documentmodifiedby
          : "Admin",
        "Modified Time": formatDate(doc.documentmodifiedtime),
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

  // Helper functions for file handling
  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result;
        const base64Data = result.split(",")[1];
        resolve(base64Data);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const getFileUrl = async (path) => {
    try {
      const response = await fetch(
        `${IP}/itelinc/resources/generic/getfileurl`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userid: userId || "39",
            url: path,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.statusCode === 200 && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || "Invalid response format");
      }
    } catch (error) {
      console.error("Error getting file URL:", error);
      throw error;
    }
  };

  const downloadDocument = async (docPath, docName) => {
    if (!docPath) {
      showToast("Document not available", "warning");
      return null;
    }

    setIsDownloading(true);
    showToast(`Preparing download for ${docName}...`, "info");

    try {
      const response = await fetch(
        `${IP}/itelinc/resources/generic/getfileurl`,
        {
          method: "POST",
          mode: "cors",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userid: userId || "39",
            url: docPath,
          }),
        }
      );

      const data = await response.json();

      if (data.statusCode === 200 && data.data) {
        const fileResponse = await fetch(data.data, {
          method: "GET",
          mode: "cors",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!fileResponse.ok) {
          const fileResponseNoAuth = await fetch(data.data, {
            method: "GET",
            mode: "cors",
          });

          if (!fileResponseNoAuth.ok) {
            throw new Error(
              `Failed to fetch the file. Status: ${fileResponseNoAuth.status}`
            );
          }

          const blob = await fileResponseNoAuth.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = docName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } else {
          const blob = await fileResponse.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = docName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }

        showToast(`Downloaded ${docName}`, "success");
      } else {
        throw new Error(data.message || "Failed to get download URL");
      }
    } catch (error) {
      console.error("Error downloading document:", error);
      showToast(`Failed to download: ${error.message}`, "error");
    } finally {
      setIsDownloading(false);
    }
  };

  const previewDocument = async (docPath, docName) => {
    if (!docPath) {
      showToast("Document not available", "warning");
      return;
    }

    setPreviewLoading(true);
    setIsPreviewModalOpen(true);
    setPreviewDoc({
      name: docName,
      url: null,
      type: null,
      originalPath: docPath,
    });
    setPreviewContent(null);

    try {
      const fileUrl = await getFileUrl(docPath);
      const extension = docName.split(".").pop().toLowerCase();
      let type = "unknown";

      switch (extension) {
        case "pdf":
          type = "pdf";
          break;
        case "doc":
        case "docx":
          type = "word";
          break;
        case "xls":
        case "xlsx":
          type = "excel";
          break;
        case "txt":
        case "csv":
        case "json":
        case "xml":
        case "html":
        case "css":
        case "js":
        case "md":
          type = "text";
          break;
        case "jpg":
        case "jpeg":
        case "png":
        case "gif":
        case "bmp":
        case "webp":
          type = "image";
          break;
        default:
          type = "unknown";
      }

      let content = null;

      if (type === "image") {
        content = { type: "image", url: fileUrl };
      } else if (type === "pdf") {
        content = { type: "pdf", url: fileUrl };
      } else if (type === "text") {
        try {
          const response = await fetch(fileUrl, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!response.ok) {
            const responseNoAuth = await fetch(fileUrl);
            if (!responseNoAuth.ok) {
              throw new Error("Failed to fetch text content");
            }
            const text = await responseNoAuth.text();
            content = { type: "text", content: text };
          } else {
            const text = await response.text();
            content = { type: "text", content: text };
          }
        } catch (error) {
          content = { type: "error", message: "Failed to load text content" };
        }
      } else {
        content = { type: "file", url: fileUrl, fileName: docName };
      }

      setPreviewDoc({
        name: docName,
        url: fileUrl,
        type: type,
        originalPath: docPath,
      });
      setPreviewContent(content);
    } catch (error) {
      console.error("Error previewing document:", error);
      showToast(`Failed to preview: ${error.message}`, "error");
      setPreviewContent({
        type: "error",
        message: `Failed to load preview: ${error.message}`,
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  // Define columns for DataGrid
  const columns = useMemo(
    () => [
      {
        field: "sno",
        headerName: "S.No",
        width: 70,
        sortable: false,
        valueGetter: (params) => {
          if (!params || !params.api) return 0;
          return params.api.getRowIndexRelativeToVisibleRows(params.row.id) + 1;
        },
      },
      {
        field: "doccatname",
        headerName: "Category",
        width: 150,
        sortable: true,
      },
      {
        field: "docsubcatname",
        headerName: "Subcategory",
        width: 150,
        sortable: true,
      },
      {
        field: "documentname",
        headerName: "Document Name",
        width: 200,
        sortable: true,
      },
      {
        field: "documentdescription",
        headerName: "Description",
        width: 250,
        sortable: true,
      },
      {
        field: "docperiodicityname",
        headerName: "Periodicity",
        width: 120,
        sortable: true,
      },
      {
        field: "documentremarks",
        headerName: "Remarks",
        width: 150,
        sortable: true,
        renderCell: (params) => {
          if (!params || !params.row) return "-";
          const remarks = params.row.documentremarks;
          return remarks ? (
            <Tooltip title={remarks} arrow>
              <span>
                {remarks.length > 20
                  ? `${remarks.substring(0, 20)}...`
                  : remarks}
              </span>
            </Tooltip>
          ) : (
            "-"
          );
        },
      },
      {
        field: "documentsampledocname",
        headerName: "Sample Document",
        width: 180,
        sortable: false,
        renderCell: (params) => {
          if (!params || !params.row) return "-";
          const docName = params.row.documentsampledocname;
          const docPath = params.row.documentsampledoc;
          return docName ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <FileIcon fileName={docName} />
              <Tooltip title={`Click to preview ${docName}`} arrow>
                <Button
                  size="small"
                  startIcon={<VisibilityIcon />}
                  onClick={() => previewDocument(docPath, docName)}
                >
                  {docName.length > 15
                    ? `${docName.substring(0, 15)}...`
                    : docName}
                </Button>
              </Tooltip>
            </Box>
          ) : (
            "-"
          );
        },
      },
      {
        field: "documenttemplatedocname",
        headerName: "Template Document",
        width: 180,
        sortable: false,
        renderCell: (params) => {
          if (!params || !params.row) return "-";
          const docName = params.row.documenttemplatedocname;
          const docPath = params.row.documenttemplatedoc;
          return docName ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <FileIcon fileName={docName} />
              <Tooltip title={`Click to preview ${docName}`} arrow>
                <Button
                  size="small"
                  startIcon={<VisibilityIcon />}
                  onClick={() => previewDocument(docPath, docName)}
                >
                  {docName.length > 15
                    ? `${docName.substring(0, 15)}...`
                    : docName}
                </Button>
              </Tooltip>
            </Box>
          ) : (
            "-"
          );
        },
      },
      ...(Number(roleid) !== 4
        ? [
            {
              field: "documentcreatedby",
              headerName: "Created By",
              width: 120,
              sortable: true,
              valueGetter: (params) => {
                if (!params || !params.row) return "Admin";
                return isNaN(params.row.documentcreatedby)
                  ? params.row.documentcreatedby
                  : "Admin";
              },
            },
            {
              field: "documentcreatedtime",
              headerName: "Created Time",
              width: 180,
              sortable: true,
              renderCell: (params) => {
                if (!params || !params.row) return "-";
                return formatDate(params.row.documentcreatedtime);
              },
            },
            {
              field: "documentmodifiedby",
              headerName: "Modified By",
              width: 120,
              sortable: true,
              valueGetter: (params) => {
                if (!params || !params.row) return "Admin";
                return isNaN(params.row.documentmodifiedby)
                  ? params.row.documentmodifiedby
                  : "Admin";
              },
            },
            {
              field: "documentmodifiedtime",
              headerName: "Modified Time",
              width: 180,
              sortable: true,
              renderCell: (params) => {
                if (!params || !params.row) return "-";
                return formatDate(params.row.documentmodifiedtime);
              },
            },
            {
              field: "actions",
              headerName: "Actions",
              width: 150,
              sortable: false,
              renderCell: (params) => {
                if (!params || !params.row) return null;

                return (
                  <Box>
                    <ActionButton
                      color="edit"
                      onClick={() => openEditModal(params.row)}
                      disabled={
                        isSaving || isDeleting[params.row.documentsrecid]
                      }
                      title="Edit"
                    >
                      <EditIcon fontSize="small" />
                    </ActionButton>
                    <ActionButton
                      color="delete"
                      onClick={() => handleDelete(params.row.documentsrecid)}
                      disabled={
                        isSaving || isDeleting[params.row.documentsrecid]
                      }
                      title="Delete"
                    >
                      {isDeleting[params.row.documentsrecid] ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <DeleteIcon fontSize="small" />
                      )}
                    </ActionButton>
                  </Box>
                );
              },
            },
          ]
        : []),
    ],
    [roleid, isSaving, isDeleting, previewDocument]
  );

  // Add unique ID to each row if not present
  const rowsWithId = useMemo(() => {
    return documents.map((doc, index) => ({
      ...doc,
      id: doc.documentsrecid || `doc-${index}`,
    }));
  }, [documents]);

  const openAddModal = () => {
    setEditDoc(null);
    setOriginalFileNames({ sample: "", template: "" });
    setFormData({
      documentname: "",
      documentdescription: "",
      documentcatrecid: "",
      documentsubcatrecid: "",
      documentperiodicityrecid: "",
      documentremarks: "",
      sampleDocName: "",
      sampleDocBase64: "",
      templateDocName: "",
      templateDocBase64: "",
    });
    setFieldErrors({});
    refreshDropdownData();
    setIsModalOpen(true);
  };

  const openEditModal = (doc) => {
    setEditDoc(doc);
    setOriginalFileNames({
      sample: doc.documentsampledocname || "",
      template: doc.documenttemplatedocname || "",
    });
    setFormData({
      documentname: doc.documentname || "",
      documentdescription: doc.documentdescription || "",
      documentcatrecid: doc.documentcatrecid || "",
      documentsubcatrecid: doc.documentsubcatrecid || "",
      documentperiodicityrecid: doc.documentperiodicityrecid || "",
      documentremarks: doc.documentremarks || "",
      sampleDocName: doc.documentsampledocname || "",
      sampleDocBase64: "",
      templateDocName: doc.documenttemplatedocname || "",
      templateDocBase64: "",
    });
    setFieldErrors({});
    refreshDropdownData();
    setIsModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (fieldErrors[name]) {
      validateField(name, value);
    }

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "documentcatrecid") {
      setFormData((prev) => ({ ...prev, documentsubcatrecid: "" }));
      if (fieldErrors.documentsubcatrecid) {
        setFieldErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.documentsubcatrecid;
          return newErrors;
        });
      }
    }
  };

  const handleSampleDocChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsUploading((prev) => ({ ...prev, sample: true }));

      try {
        if (file.size > 10 * 1024 * 1024) {
          showToast(
            `File size ${(file.size / (1024 * 1024)).toFixed(
              2
            )}MB exceeds the 10MB limit`,
            "error"
          );
          e.target.value = "";
          return;
        }

        const allowedTypes = [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "text/plain",
        ];
        if (!allowedTypes.includes(file.type)) {
          showToast(
            "Invalid file type. Please select PDF, DOC, DOCX, XLS, XLSX, or TXT files.",
            "error"
          );
          e.target.value = "";
          return;
        }

        const base64 = await convertFileToBase64(file);
        setFormData((prev) => ({
          ...prev,
          sampleDocName: file.name,
          sampleDocBase64: base64,
        }));
        showToast("Sample document uploaded successfully", "success");
      } catch (error) {
        console.error("Error converting file to base64:", error);
        showToast("Failed to process sample document", "error");
        e.target.value = "";
      } finally {
        setIsUploading((prev) => ({ ...prev, sample: false }));
      }
    }
  };

  const handleTemplateDocChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsUploading((prev) => ({ ...prev, template: true }));

      try {
        if (file.size > 10 * 1024 * 1024) {
          showToast(
            `File size ${(file.size / (1024 * 1024)).toFixed(
              2
            )}MB exceeds the 10MB limit`,
            "error"
          );
          e.target.value = "";
          return;
        }

        const allowedTypes = [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "text/plain",
        ];
        if (!allowedTypes.includes(file.type)) {
          showToast(
            "Invalid file type. Please select PDF, DOC, DOCX, XLS, XLSX, or TXT files.",
            "error"
          );
          e.target.value = "";
          return;
        }

        const base64 = await convertFileToBase64(file);
        setFormData((prev) => ({
          ...prev,
          templateDocName: file.name,
          templateDocBase64: base64,
        }));
        showToast("Template document uploaded successfully", "success");
      } catch (error) {
        console.error("Error converting file to base64:", error);
        showToast("Failed to process template document", "error");
        e.target.value = "";
      } finally {
        setIsUploading((prev) => ({ ...prev, template: false }));
      }
    }
  };

  const getFilteredSubcategories = () => {
    if (!formData.documentcatrecid || subcats.length === 0) {
      return [];
    }

    const filtered = subcats.filter((sc) => {
      const catId = String(formData.documentcatrecid);
      return sc.docsubcatscatrecid && String(sc.docsubcatscatrecid) === catId;
    });

    return filtered;
  };

  const handleDelete = (docId) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This document will be deleted permanently.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        setIsDeleting((prev) => ({ ...prev, [docId]: true }));

        Swal.fire({
          title: "Deleting...",
          text: "Please wait while we delete the document",
          allowOutsideClick: false,
          allowEscapeKey: false,
          showConfirmButton: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });

        const url = `${IP}/itelinc/api/documents/deleteDocumentDetails`;
        const requestBody = {
          documentsrecid: docId,
          documentmodifiedby: parseInt(userId) || 39,
        };

        fetch(url, {
          method: "POST",
          mode: "cors",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.statusCode === 200) {
              Swal.fire(
                "Deleted!",
                "Document deleted successfully!",
                "success"
              );
              refreshData();
            } else {
              throw new Error(data.message || "Failed to delete document");
            }
          })
          .catch((err) => {
            console.error("Error deleting document:", err);
            showToast(`Failed to delete: ${err.message}`, "error");
            Swal.close();
          })
          .finally(() => {
            setIsDeleting((prev) => ({ ...prev, [docId]: false }));
          });
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast("Please fix the errors in the form", "error");
      return;
    }

    setIsSaving(true);
    setIsModalOpen(false);

    const loadingTitle = editDoc ? "Updating..." : "Saving...";
    const loadingText = editDoc
      ? "Please wait while we update the document"
      : "Please wait while we save the document";

    Swal.fire({
      title: loadingTitle,
      text: loadingText,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      let subcatId = formData.documentsubcatrecid;

      if (isNaN(formData.documentsubcatrecid)) {
        const subcatByName = subcats.find(
          (sc) => sc.docsubcatname === formData.documentsubcatrecid
        );
        if (subcatByName) {
          subcatId = subcatByName.docsubcatrecid;
        } else {
          showToast("Invalid subcategory selected", "error");
          setIsSaving(false);
          return;
        }
      } else {
        if (typeof subcatId === "string" && subcatId !== "") {
          subcatId = parseInt(subcatId);
        }
      }

      if (!subcatId || isNaN(subcatId)) {
        showToast("Please select a valid subcategory", "error");
        setIsSaving(false);
        return;
      }

      if (editDoc) {
        const requestBody = {
          userid: parseInt(userId) || 32,
          documentsrecid: editDoc.documentsrecid,
          doccatid: parseInt(formData.documentcatrecid),
          docsubcatid: subcatId,
          documentperiodicityrecid: parseInt(formData.documentperiodicityrecid),
          documentname: formData.documentname.trim(),
          documentdescription: formData.documentdescription.trim(),
          documentcreatedby: editDoc.documentcreatedby,
          documentmodifiedby: parseInt(userId) || 32,
          documentremarks: formData.documentremarks || "",
          sampleDocName: formData.sampleDocName || originalFileNames.sample,
          templateDocName:
            formData.templateDocName || originalFileNames.template,
        };

        if (formData.sampleDocBase64) {
          requestBody.sampleDocBase64 = formData.sampleDocBase64;
        }
        if (formData.templateDocBase64) {
          requestBody.templateDocBase64 = formData.templateDocBase64;
        }

        const url = `${IP}/itelinc/api/documents/updateDocumentDetails`;

        const response = await fetch(url, {
          method: "POST",
          mode: "cors",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (data.statusCode === 200) {
          setEditDoc(null);
          refreshData();
          Swal.fire(
            "Success",
            data.message || "Document updated successfully!",
            "success"
          );
        } else {
          throw new Error(data.message || "Operation failed");
        }
      } else {
        const userIdValue = userId ? parseInt(userId) : 39;
        const catIdValue = formData.documentcatrecid
          ? parseInt(formData.documentcatrecid)
          : null;
        const subcatIdValue = subcatId ? parseInt(subcatId) : null;

        if (!userIdValue || !catIdValue || !subcatIdValue) {
          showToast("Missing required information", "error");
          setIsSaving(false);
          return;
        }

        const requestBody = {
          userid: userIdValue,
          doccatid: catIdValue,
          docsubcatid: subcatIdValue,
          documentperiodicityrecid:
            parseInt(formData.documentperiodicityrecid) || 4,
          documentname: formData.documentname.trim(),
          documentdescription: formData.documentdescription.trim(),
          documentcreatedby: userIdValue,
          documentmodifiedby: userIdValue,
          documentremarks: formData.documentremarks || "",
          sampleDocName: formData.sampleDocName || "",
          sampleDocBase64: formData.sampleDocBase64 || "",
          templateDocName: formData.templateDocName || "",
          templateDocBase64: formData.templateDocBase64 || "",
        };

        const url = `${IP}/itelinc/api/documents/addDocumentDetails`;

        const response = await fetch(url, {
          method: "POST",
          mode: "cors",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (data.statusCode === 200) {
          if (data.data && data.data.includes("Duplicate entry")) {
            const docNameMatch = data.data.match(/Duplicate entry '([^']+)'/);
            const docName = docNameMatch ? docNameMatch[1] : "this document";

            Swal.fire(
              "Duplicate Document",
              `A document with the same details (${docName}) already exists.`,
              "warning"
            ).then(() => {
              setIsModalOpen(true);
              setFieldErrors({
                documentname: `Document "${docName}" already exists`,
              });
            });
          } else {
            setEditDoc(null);
            refreshData();
            Swal.fire(
              "Success",
              data.message || "Document saved successfully!",
              "success"
            );
          }
        } else {
          throw new Error(data.message || "Operation failed");
        }
      }
    } catch (err) {
      console.error("Error saving document:", err);
      showToast(`Failed to save: ${err.message}`, "error");
      Swal.close();
      setIsModalOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h4">{title}</Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          {Number(roleid) === 1 && (
            <Button
              variant="contained"
              onClick={openAddModal}
              disabled={isSaving}
            >
              + Add Document
            </Button>
          )}
          {/* Export Buttons */}
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
      </Box>

      {/* Results Info */}
      <Box sx={{ mb: 1, color: "text.secondary" }}>
        Showing {paginationModel.page * paginationModel.pageSize + 1} to{" "}
        {Math.min(
          (paginationModel.page + 1) * paginationModel.pageSize,
          documents.length
        )}{" "}
        of {documents.length} entries
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
          loading={loading}
          autoHeight
        />
      </StyledPaper>

      {documents.length === 0 && !loading && (
        <Box sx={{ textAlign: "center", py: 3, color: "text.secondary" }}>
          No documents found
        </Box>
      )}

      {/* Modal for Add/Edit */}
      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editDoc ? "Edit Document" : "Add Document"}
          <IconButton
            aria-label="close"
            onClick={() => setIsModalOpen(false)}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
            disabled={isSaving}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2} direction="column">
              <Grid item xs={12}>
                <FormControl
                  fullWidth
                  margin="dense"
                  error={!!fieldErrors.documentcatrecid}
                >
                  <InputLabel>Category *</InputLabel>
                  <Select
                    name="documentcatrecid"
                    value={formData.documentcatrecid}
                    onChange={handleChange}
                    required
                    disabled={isSaving}
                  >
                    <MenuItem value="">Select Category</MenuItem>
                    {cats.map((cat) => (
                      <MenuItem key={cat.doccatrecid} value={cat.doccatrecid}>
                        {cat.doccatname}
                      </MenuItem>
                    ))}
                  </Select>
                  {fieldErrors.documentcatrecid && (
                    <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                      {fieldErrors.documentcatrecid}
                    </Typography>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControl
                  fullWidth
                  margin="dense"
                  error={!!fieldErrors.documentsubcatrecid}
                >
                  <InputLabel>Subcategory *</InputLabel>
                  <Select
                    name="documentsubcatrecid"
                    value={formData.documentsubcatrecid}
                    onChange={handleChange}
                    required
                    disabled={!formData.documentcatrecid || isSaving}
                  >
                    <MenuItem value="">Select Subcategory</MenuItem>
                    {getFilteredSubcategories().length > 0 ? (
                      getFilteredSubcategories().map((sc) => (
                        <MenuItem
                          key={sc.docsubcatrecid}
                          value={sc.docsubcatrecid}
                        >
                          {sc.docsubcatname}
                        </MenuItem>
                      ))
                    ) : formData.documentcatrecid ? (
                      <MenuItem value="" disabled>
                        No subcategories available for this category
                      </MenuItem>
                    ) : (
                      <MenuItem value="" disabled>
                        Please select a category first
                      </MenuItem>
                    )}
                  </Select>
                  {fieldErrors.documentsubcatrecid && (
                    <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                      {fieldErrors.documentsubcatrecid}
                    </Typography>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControl
                  fullWidth
                  margin="dense"
                  error={!!fieldErrors.documentperiodicityrecid}
                >
                  <InputLabel>Periodicity *</InputLabel>
                  <Select
                    name="documentperiodicityrecid"
                    value={formData.documentperiodicityrecid}
                    onChange={handleChange}
                    required
                    disabled={isSaving}
                  >
                    <MenuItem value="">Select Periodicity</MenuItem>
                    <MenuItem value="1">One-time</MenuItem>
                    <MenuItem value="2">Monthly</MenuItem>
                    <MenuItem value="3">Quarterly</MenuItem>
                    <MenuItem value="4">Yearly</MenuItem>
                  </Select>
                  {fieldErrors.documentperiodicityrecid && (
                    <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                      {fieldErrors.documentperiodicityrecid}
                    </Typography>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  margin="dense"
                  name="documentname"
                  label="Document Name *"
                  type="text"
                  variant="outlined"
                  value={formData.documentname}
                  onChange={handleChange}
                  onBlur={(e) => validateField("documentname", e.target.value)}
                  required
                  disabled={isSaving}
                  error={!!fieldErrors.documentname}
                  helperText={fieldErrors.documentname}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  margin="dense"
                  name="documentdescription"
                  label="Description *"
                  multiline
                  rows={3}
                  variant="outlined"
                  value={formData.documentdescription}
                  onChange={handleChange}
                  onBlur={(e) =>
                    validateField("documentdescription", e.target.value)
                  }
                  required
                  disabled={isSaving}
                  error={!!fieldErrors.documentdescription}
                  helperText={fieldErrors.documentdescription}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  margin="dense"
                  name="documentremarks"
                  label="Remarks"
                  variant="outlined"
                  value={formData.documentremarks}
                  onChange={handleChange}
                  disabled={isSaving}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {editDoc ? "Replace Sample Document" : "Sample Document"}
                </Typography>
                <FileUploadButton
                  variant="outlined"
                  component="label"
                  disabled={isSaving || isUploading.sample}
                  fullWidth
                >
                  {isUploading.sample ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <CloudUploadIcon sx={{ mr: 1 }} />
                      Choose File
                    </>
                  )}
                  <input
                    type="file"
                    onChange={handleSampleDocChange}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                  />
                </FileUploadButton>
                <Typography variant="caption" sx={{ mt: 1, display: "block" }}>
                  {formData.sampleDocName || "No file chosen"}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {editDoc ? "Replace Template Document" : "Template Document"}
                </Typography>
                <FileUploadButton
                  variant="outlined"
                  component="label"
                  disabled={isSaving || isUploading.template}
                  fullWidth
                >
                  {isUploading.template ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <CloudUploadIcon sx={{ mr: 1 }} />
                      Choose File
                    </>
                  )}
                  <input
                    type="file"
                    onChange={handleTemplateDocChange}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                  />
                </FileUploadButton>
                <Typography variant="caption" sx={{ mt: 1, display: "block" }}>
                  {formData.templateDocName || "No file chosen"}
                </Typography>
              </Grid>

              {editDoc && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ mb: 2 }}>
                    Existing Documents
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Sample Document
                    </Typography>
                    {editDoc.documentsampledocname ? (
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <FileIcon fileName={editDoc.documentsampledocname} />
                        <Typography variant="body2">
                          {editDoc.documentsampledocname}
                        </Typography>
                        <Button
                          size="small"
                          startIcon={<VisibilityIcon />}
                          onClick={() =>
                            previewDocument(
                              editDoc.documentsampledoc,
                              editDoc.documentsampledocname
                            )
                          }
                        >
                          Preview
                        </Button>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No sample document
                      </Typography>
                    )}
                  </Box>

                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Template Document
                    </Typography>
                    {editDoc.documenttemplatedocname ? (
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <FileIcon fileName={editDoc.documenttemplatedocname} />
                        <Typography variant="body2">
                          {editDoc.documenttemplatedocname}
                        </Typography>
                        <Button
                          size="small"
                          startIcon={<VisibilityIcon />}
                          onClick={() =>
                            previewDocument(
                              editDoc.documenttemplatedoc,
                              editDoc.documenttemplatedocname
                            )
                          }
                        >
                          Preview
                        </Button>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No template document
                      </Typography>
                    )}
                  </Box>
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsModalOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSaving || Object.keys(fieldErrors).length > 0}
              startIcon={isSaving ? <CircularProgress size={20} /> : null}
            >
              {isSaving ? "Saving..." : editDoc ? "Update" : "Save"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Preview Modal */}
      <Dialog
        open={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {previewDoc?.name}
          <IconButton
            aria-label="close"
            onClick={() => setIsPreviewModalOpen(false)}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ minHeight: 500 }}>
          {previewLoading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: 300,
              }}
            >
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>
                Loading document preview...
              </Typography>
            </Box>
          ) : (
            <>
              {previewContent && previewContent.type === "image" && (
                <Box sx={{ textAlign: "center" }}>
                  <img
                    src={previewContent.url}
                    alt="Preview"
                    style={{ maxWidth: "100%", maxHeight: "500px" }}
                  />
                </Box>
              )}

              {previewContent && previewContent.type === "pdf" && (
                <iframe
                  src={`${previewContent.url}#view=FitH`}
                  style={{ width: "100%", height: "500px", border: "none" }}
                  title="PDF Preview"
                />
              )}

              {previewContent && previewContent.type === "text" && (
                <Box
                  sx={{
                    whiteSpace: "pre-wrap",
                    fontFamily: "monospace",
                    fontSize: "14px",
                  }}
                >
                  {previewContent.content}
                </Box>
              )}

              {previewContent && previewContent.type === "file" && (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <FileIcon
                    fileName={previewDoc?.name}
                    sx={{ fontSize: 64, mb: 2 }}
                  />
                  <Typography>
                    Preview not available for this file type.
                  </Typography>
                  <Typography>
                    Click the download button to view this file.
                  </Typography>
                </Box>
              )}

              {previewContent && previewContent.type === "error" && (
                <Box sx={{ textAlign: "center", py: 4, color: "error.main" }}>
                  <Typography>{previewContent.message}</Typography>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPreviewModalOpen(false)}>Close</Button>
          {previewDoc?.originalPath && (
            <Button
              variant="contained"
              onClick={() =>
                downloadDocument(previewDoc.originalPath, previewDoc.name)
              }
              disabled={isDownloading}
              startIcon={
                isDownloading ? (
                  <CircularProgress size={20} />
                ) : (
                  <Download size={16} />
                )
              }
            >
              {isDownloading ? "Downloading..." : "Download"}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Toast notification */}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={() => setToast({ ...toast, open: false })}
          severity={toast.severity}
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>

      {/* Loading overlay for operations */}
      <StyledBackdrop open={isSaving}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <CircularProgress color="inherit" />
          <Typography sx={{ mt: 2 }}>
            {editDoc ? "Updating document..." : "Saving document..."}
          </Typography>
        </Box>
      </StyledBackdrop>
    </Box>
  );
});

DocumentsTable.displayName = "DocumentsTable";

export default DocumentsTable;
