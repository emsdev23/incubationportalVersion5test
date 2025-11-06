import React, { useEffect, useState, useMemo } from "react";
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
  Modal,
  IconButton,
  Chip,
  CircularProgress,
  Backdrop,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";

// Styled components
const StyledPaper = styled(Paper)(({ theme }) => ({
  height: 500,
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

// Common date formatting function
const formatDate = (dateStr) => {
  if (!dateStr) return "-";

  try {
    // Handle the timestamp format from the API
    if (Array.isArray(dateStr)) {
      dateStr = dateStr.map((num) => num.toString().padStart(2, "0")).join("");
    } else {
      dateStr = String(dateStr).replace(/,/g, "");
    }

    if (dateStr.length < 14) dateStr = dateStr.padEnd(14, "0");

    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const hour = dateStr.substring(8, 10);
    const minute = dateStr.substring(10, 12);
    const second = dateStr.substring(12, 14);

    const formattedDate = new Date(
      `${year}-${month}-${day}T${hour}:${minute}:${second}`
    );

    return formattedDate.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateStr; // Return original if error
  }
};

export default function DocSubCatTable() {
  const userId = sessionStorage.getItem("userid");
  const token = sessionStorage.getItem("token");
  const incUserid = sessionStorage.getItem("incuserid");
  const IP = IPAdress;

  const [subcats, setSubcats] = useState([]);
  const [cats, setCats] = useState([]); // categories for dropdown
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editSubCat, setEditSubCat] = useState(null);
  const [formData, setFormData] = useState({
    docsubcatname: "",
    docsubcatdescription: "",
    docsubcatscatrecid: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Pagination state for Material UI
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });

  // Check if XLSX is available
  const isXLSXAvailable = !!XLSX;

  // Fetch all subcategories
  const fetchSubCategories = () => {
    const url = `${IP}/itelinc/getDocsubcatAll?incuserid=${encodeURIComponent(
      incUserid
    )}`;
    setLoading(true);
    setError(null);
    fetch(url, {
      method: "GET",
      mode: "cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    })
      .then((res) => res.json())
      .then((data) => {
        setSubcats(data.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching subcategories:", err);
        setError("Failed to load subcategories. Please try again.");
        setLoading(false);
      });
  };

  // Fetch categories for dropdown
  const fetchCategories = () => {
    const url = `${IP}/itelinc/getDoccatAll?incuserid=${encodeURIComponent(
      incUserid
    )}`;
    fetch(url, {
      method: "GET",
      mode: "cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    })
      .then((res) => res.json())
      .then((data) => setCats(data.data || []))
      .catch((err) => console.error("Error fetching categories:", err));
  };

  // Refresh both subcategories and categories
  const refreshData = () => {
    fetchSubCategories();
    fetchCategories();
  };

  useEffect(() => {
    refreshData(); // Use refreshData instead of separate calls
  }, []);

  // Export to CSV function
  const exportToCSV = () => {
    // Create a copy of the data for export
    const exportData = subcats.map((subcat, index) => ({
      "S.No": index + 1,
      Category: subcat.doccatname || "N/A",
      "Subcategory Name": subcat.docsubcatname || "",
      Description: subcat.docsubcatdescription || "",
      "Created By": isNaN(subcat.docsubcatcreatedby)
        ? subcat.docsubcatcreatedby
        : "Admin",
      "Created Time": formatDate(subcat.docsubcatcreatedtime),
      "Modified By": isNaN(subcat.docsubcatmodifiedby)
        ? subcat.docsubcatmodifiedby
        : "Admin",
      "Modified Time": formatDate(subcat.docsubcatmodifiedtime),
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
      `document_subcategories_${new Date().toISOString().slice(0, 10)}.csv`
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
      const exportData = subcats.map((subcat, index) => ({
        "S.No": index + 1,
        Category: subcat.doccatname || "N/A",
        "Subcategory Name": subcat.docsubcatname || "",
        Description: subcat.docsubcatdescription || "",
        "Created By": isNaN(subcat.docsubcatcreatedby)
          ? subcat.docsubcatcreatedby
          : "Admin",
        "Created Time": formatDate(subcat.docsubcatcreatedtime),
        "Modified By": isNaN(subcat.docsubcatmodifiedby)
          ? subcat.docsubcatmodifiedby
          : "Admin",
        "Modified Time": formatDate(subcat.docsubcatmodifiedtime),
      }));

      // Create a workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(wb, ws, "Document Subcategories");

      // Generate the Excel file and download
      XLSX.writeFile(
        wb,
        `document_subcategories_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Error exporting to Excel. Falling back to CSV export.");
      exportToCSV();
    }
  };

  // Define columns for DataGrid
  const columns = [
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
      width: 180,
      sortable: true,
      valueGetter: (params) => {
        if (!params || !params.row) return "N/A";
        return params.row.doccatname || "N/A";
      },
    },
    {
      field: "docsubcatname",
      headerName: "Subcategory Name",
      width: 200,
      sortable: true,
    },
    {
      field: "docsubcatdescription",
      headerName: "Description",
      width: 250,
      sortable: true,
    },
    {
      field: "docsubcatcreatedby",
      headerName: "Created By",
      width: 150,
      sortable: true,
      valueGetter: (params) => {
        if (!params || !params.row) return "Admin";
        return isNaN(params.row.docsubcatcreatedby)
          ? params.row.docsubcatcreatedby
          : "Admin";
      },
    },
    {
      field: "docsubcatcreatedtime",
      headerName: "Created Time",
      width: 180,
      sortable: true,
      renderCell: (params) => {
        if (!params || !params.row) return "-";
        return formatDate(params.row.docsubcatcreatedtime);
      },
    },
    {
      field: "docsubcatmodifiedby",
      headerName: "Modified By",
      width: 150,
      sortable: true,
      valueGetter: (params) => {
        if (!params || !params.row) return "Admin";
        return isNaN(params.row.docsubcatmodifiedby)
          ? params.row.docsubcatmodifiedby
          : "Admin";
      },
    },
    {
      field: "docsubcatmodifiedtime",
      headerName: "Modified Time",
      width: 180,
      sortable: true,
      renderCell: (params) => {
        if (!params || !params.row) return "-";
        return formatDate(params.row.docsubcatmodifiedtime);
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
              disabled={isSaving || isDeleting[params.row.docsubcatrecid]}
              title="Edit"
            >
              <EditIcon fontSize="small" />
            </ActionButton>
            <ActionButton
              color="delete"
              onClick={() => handleDelete(params.row.docsubcatrecid)}
              disabled={isSaving || isDeleting[params.row.docsubcatrecid]}
              title="Delete"
            >
              {isDeleting[params.row.docsubcatrecid] ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <DeleteIcon fontSize="small" />
              )}
            </ActionButton>
          </Box>
        );
      },
    },
  ];

  // Add unique ID to each row if not present
  const rowsWithId = useMemo(() => {
    return subcats.map((subcat, index) => ({
      ...subcat,
      id: subcat.docsubcatrecid || `subcat-${index}`,
    }));
  }, [subcats]);

  const openAddModal = () => {
    setEditSubCat(null);
    setFormData({
      docsubcatname: "",
      docsubcatdescription: "",
      docsubcatscatrecid: "",
    });
    // Refresh categories before opening the modal to get the latest list
    fetchCategories();
    setIsModalOpen(true);
    setError(null);
  };

  const openEditModal = (subcat) => {
    setEditSubCat(subcat);
    setFormData({
      docsubcatname: subcat.docsubcatname || "",
      docsubcatdescription: subcat.docsubcatdescription || "",
      docsubcatscatrecid: subcat.docsubcatscatrecid || "",
    });
    // Refresh categories before opening the modal to get the latest list
    fetchCategories();
    setIsModalOpen(true);
    setError(null);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Delete with SweetAlert and loading popup
  const handleDelete = (subcatId) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This subcategory will be deleted permanently.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        // Set loading state for this specific subcategory
        setIsDeleting((prev) => ({ ...prev, [subcatId]: true }));

        // Show loading popup
        Swal.fire({
          title: "Deleting...",
          text: "Please wait while we delete the subcategory",
          allowOutsideClick: false,
          allowEscapeKey: false,
          showConfirmButton: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });

        const deleteUrl = `${IP}/itelinc/deleteDocsubcat?docsubcatrecid=${subcatId}&docsubcatmodifiedby=${
          userId || "32"
        }`;

        fetch(deleteUrl, {
          method: "POST",
          mode: "cors",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.statusCode === 200) {
              Swal.fire(
                "Deleted!",
                "Subcategory deleted successfully!",
                "success"
              );
              refreshData(); // Use refreshData instead of just fetchSubCategories
            } else {
              throw new Error(data.message || "Failed to delete subcategory");
            }
          })
          .catch((err) => {
            console.error("Error deleting subcategory:", err);
            Swal.fire("Error", `Failed to delete: ${err.message}`, "error");
          })
          .finally(() => {
            // Remove loading state for this subcategory
            setIsDeleting((prev) => ({ ...prev, [subcatId]: false }));
          });
      }
    });
  };

  // Add/Update with proper URL parameters and loading popup
  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    // Validate form data
    if (
      !formData.docsubcatname.trim() ||
      !formData.docsubcatdescription.trim() ||
      !formData.docsubcatscatrecid
    ) {
      setError("All fields are required");
      setIsSaving(false);
      return;
    }

    // Close the modal before showing the loading popup
    setIsModalOpen(false);

    // Show loading popup
    const loadingTitle = editSubCat ? "Updating..." : "Saving...";
    const loadingText = editSubCat
      ? "Please wait while we update the subcategory"
      : "Please wait while we save the subcategory";

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

    // Build URL parameters safely
    const params = new URLSearchParams();

    if (editSubCat) {
      params.append("docsubcatrecid", editSubCat.docsubcatrecid);
    }
    params.append("docsubcatname", formData.docsubcatname.trim());
    params.append("docsubcatdescription", formData.docsubcatdescription.trim());
    params.append("docsubcatscatrecid", formData.docsubcatscatrecid);

    // User ID is REQUIRED for both add and update operations
    if (editSubCat) {
      params.append("docsubcatmodifiedby", userId || "32");
    } else {
      params.append("docsubcatcreatedby", userId || "32");
      params.append("docsubcatmodifiedby", userId || "32");
      params.append("userid", userId || "32");
    }

    const baseUrl = editSubCat
      ? `${IP}/itelinc/updateDocsubcat`
      : `${IP}/itelinc/addDocsubcat`;

    const url = `${baseUrl}?${params.toString()}`;

    console.log("API URL:", url); // Debug URL

    fetch(url, {
      method: "POST",
      mode: "cors",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log("API Response:", data);

        if (data.statusCode === 200) {
          // Handle duplicate subcategory error
          if (
            data.data &&
            typeof data.data === "string" &&
            data.data.includes("Duplicate entry") &&
            data.data.includes("docsubcat.unique_docsubcat_active")
          ) {
            setError("Subcategory name already exists for this category");
            Swal.fire(
              "Duplicate",
              "Subcategory name already exists for this category!",
              "warning"
            ).then(() => {
              // Reopen the modal if there's a duplicate error
              setIsModalOpen(true);
            });
          } else {
            setEditSubCat(null);
            setFormData({
              docsubcatname: "",
              docsubcatdescription: "",
              docsubcatscatrecid: "",
            });
            refreshData(); // Use refreshData instead of just fetchSubCategories
            Swal.fire(
              "Success",
              data.message || "Subcategory saved successfully!",
              "success"
            );
          }
        } else {
          throw new Error(
            data.message || `Operation failed with status: ${data.statusCode}`
          );
        }
      })
      .catch((err) => {
        console.error("Error saving subcategory:", err);
        setError(`Failed to save: ${err.message}`);
        Swal.fire(
          "Error",
          `Failed to save subcategory: ${err.message}`,
          "error"
        ).then(() => {
          // Reopen the modal if there's an error
          setIsModalOpen(true);
        });
      })
      .finally(() => setIsSaving(false));
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
        <Typography variant="h4">📂 Document Subcategories</Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="contained"
            onClick={openAddModal}
            disabled={isSaving}
          >
            + Add Subcategory
          </Button>
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

      {error && (
        <Box
          sx={{
            p: 2,
            mb: 2,
            bgcolor: "error.light",
            color: "error.contrastText",
            borderRadius: 1,
          }}
        >
          {error}
        </Box>
      )}

      {/* Results Info */}
      <Box sx={{ mb: 1, color: "text.secondary" }}>
        Showing {paginationModel.page * paginationModel.pageSize + 1} to{" "}
        {Math.min(
          (paginationModel.page + 1) * paginationModel.pageSize,
          subcats.length
        )}{" "}
        of {subcats.length} entries
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

      {subcats.length === 0 && !loading && (
        <Box sx={{ textAlign: "center", py: 3, color: "text.secondary" }}>
          No subcategories found
        </Box>
      )}

      {/* Modal for Add/Edit */}
      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editSubCat ? "Edit Subcategory" : "Add Subcategory"}
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
            <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
              <InputLabel id="category-select-label">Category *</InputLabel>
              <Select
                labelId="category-select-label"
                name="docsubcatscatrecid"
                value={formData.docsubcatscatrecid}
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
            </FormControl>
            <TextField
              autoFocus
              margin="dense"
              name="docsubcatname"
              label="Subcategory Name"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.docsubcatname}
              onChange={handleChange}
              required
              disabled={isSaving}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              name="docsubcatdescription"
              label="Description"
              type="text"
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              value={formData.docsubcatdescription}
              onChange={handleChange}
              required
              disabled={isSaving}
            />
            {error && <Box sx={{ color: "error.main", mt: 1 }}>{error}</Box>}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsModalOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSaving}
              startIcon={isSaving ? <CircularProgress size={20} /> : null}
            >
              {editSubCat ? "Update" : "Save"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

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
            {editSubCat ? "Updating subcategory..." : "Saving subcategory..."}
          </Typography>
        </Box>
      </StyledBackdrop>
    </Box>
  );
}
