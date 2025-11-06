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
} from "@mui/material";
import { styled } from "@mui/material/styles";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";

// Styled components
const StyledPaper = styled(Paper)(({ theme }) => ({
  // height: 500,
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

export default function DocCatTable() {
  const userId = sessionStorage.getItem("userid");
  const token = sessionStorage.getItem("token");
  const incUserid = sessionStorage.getItem("incuserid");
  const IP = IPAdress;

  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [formData, setFormData] = useState({
    doccatname: "",
    doccatdescription: "",
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

  // Fetch all categories
  const fetchCategories = () => {
    setLoading(true);
    setError(null);

    const url = `${IP}/itelinc/getDoccatAll?incuserid=${encodeURIComponent(
      incUserid
    )}`;

    fetch(url, {
      method: "GET",
      mode: "cors",
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setCats(data.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching categories:", err);
        setError("Failed to load categories. Please try again.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Export to CSV function
  const exportToCSV = () => {
    // Create a copy of the data for export
    const exportData = cats.map((cat, index) => ({
      "S.No": index + 1,
      "Category Name": cat.doccatname || "",
      Description: cat.doccatdescription || "",
      "Created By": isNaN(cat.doccatcreatedby) ? cat.doccatcreatedby : "Admin",
      "Created Time": formatDate(cat.doccatcreatedtime),
      "Modified By": isNaN(cat.doccatmodifiedby)
        ? cat.doccatmodifiedby
        : "Admin",
      "Modified Time": formatDate(cat.doccatmodifiedtime),
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
      `document_categories_${new Date().toISOString().slice(0, 10)}.csv`
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
      const exportData = cats.map((cat, index) => ({
        "S.No": index + 1,
        "Category Name": cat.doccatname || "",
        Description: cat.doccatdescription || "",
        "Created By": isNaN(cat.doccatcreatedby)
          ? cat.doccatcreatedby
          : "Admin",
        "Created Time": formatDate(cat.doccatcreatedtime),
        "Modified By": isNaN(cat.doccatmodifiedby)
          ? cat.doccatmodifiedby
          : "Admin",
        "Modified Time": formatDate(cat.doccatmodifiedtime),
      }));

      // Create a workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(wb, ws, "Document Categories");

      // Generate the Excel file and download
      XLSX.writeFile(
        wb,
        `document_categories_${new Date().toISOString().slice(0, 10)}.xlsx`
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
      headerName: "Category Name",
      width: 200,
      sortable: true,
    },
    {
      field: "doccatdescription",
      headerName: "Description",
      width: 300,
      sortable: true,
    },
    {
      field: "doccatcreatedby",
      headerName: "Created By",
      width: 150,
      sortable: true,
      valueGetter: (params) => {
        if (!params || !params.row) return "Admin";
        return isNaN(params.row.doccatcreatedby)
          ? params.row.doccatcreatedby
          : "Admin";
      },
    },
    {
      field: "doccatcreatedtime",
      headerName: "Created Time",
      width: 180,
      sortable: true,
      renderCell: (params) => {
        if (!params || !params.row) return "-";
        return formatDate(params.row.doccatcreatedtime);
      },
    },
    {
      field: "doccatmodifiedby",
      headerName: "Modified By",
      width: 150,
      sortable: true,
      valueGetter: (params) => {
        if (!params || !params.row) return "Admin";
        return isNaN(params.row.doccatmodifiedby)
          ? params.row.doccatmodifiedby
          : "Admin";
      },
    },
    {
      field: "doccatmodifiedtime",
      headerName: "Modified Time",
      width: 180,
      sortable: true,
      renderCell: (params) => {
        if (!params || !params.row) return "-";
        return formatDate(params.row.doccatmodifiedtime);
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
              disabled={isSaving || isDeleting[params.row.doccatrecid]}
              title="Edit"
            >
              <EditIcon fontSize="small" />
            </ActionButton>
            <ActionButton
              color="delete"
              onClick={() => handleDelete(params.row.doccatrecid)}
              disabled={isSaving || isDeleting[params.row.doccatrecid]}
              title="Delete"
            >
              {isDeleting[params.row.doccatrecid] ? (
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
    return cats.map((cat, index) => ({
      ...cat,
      id: cat.doccatrecid || `cat-${index}`,
    }));
  }, [cats]);

  const openAddModal = () => {
    setEditCat(null);
    setFormData({ doccatname: "", doccatdescription: "" });
    setIsModalOpen(true);
    setError(null);
  };

  const openEditModal = (cat) => {
    setEditCat(cat);
    setFormData({
      doccatname: cat.doccatname || "",
      doccatdescription: cat.doccatdescription || "",
    });
    setIsModalOpen(true);
    setError(null);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Delete with SweetAlert and loading popup
  const handleDelete = (catId) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This category will be deleted permanently.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        // Set loading state for this specific category
        setIsDeleting((prev) => ({ ...prev, [catId]: true }));

        // Show loading popup
        Swal.fire({
          title: "Deleting...",
          text: "Please wait while we delete the category",
          allowOutsideClick: false,
          allowEscapeKey: false,
          showConfirmButton: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });

        const deleteUrl = `${IP}/itelinc/deletedoccat?doccatrecid=${catId}&doccatmodifiedby=${userId}`;

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
                "Category deleted successfully!",
                "success"
              );
              fetchCategories();
            } else {
              throw new Error(data.message || "Failed to delete category");
            }
          })
          .catch((err) => {
            console.error("Error deleting category:", err);
            Swal.fire("Error", `Failed to delete: ${err.message}`, "error");
          })
          .finally(() => {
            // Remove loading state for this category
            setIsDeleting((prev) => ({ ...prev, [catId]: false }));
          });
      }
    });
  };

  // Add/Update with proper URL encoding and loading popup
  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    // Validate form data
    if (!formData.doccatname.trim() || !formData.doccatdescription.trim()) {
      setError("Category name and description are required");
      setIsSaving(false);
      return;
    }

    // Close the modal before showing the loading popup
    setIsModalOpen(false);

    // Show loading popup
    const loadingTitle = editCat ? "Updating..." : "Saving...";
    const loadingText = editCat
      ? "Please wait while we update the category"
      : "Please wait while we save the category";

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

    if (editCat) {
      params.append("doccatrecid", editCat.doccatrecid);
    }
    params.append("doccatname", formData.doccatname.trim());
    params.append("doccatdescription", formData.doccatdescription.trim());

    // User ID is REQUIRED for both add and update operations
    if (editCat) {
      params.append("doccatmodifiedby", userId || "1"); // Fallback to "1" if null
    } else {
      params.append("doccatcreatedby", userId || "1");
      params.append("doccatmodifiedby", userId || "1");
    }

    const baseUrl = editCat
      ? `${IP}/itelinc/updateDoccat`
      : `${IP}/itelinc/addDoccat`;

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
          if (
            data.data &&
            typeof data.data === "string" &&
            data.data.includes("Duplicate entry")
          ) {
            setError("Category name already exists");
            Swal.fire(
              "Duplicate",
              "Category name already exists!",
              "warning"
            ).then(() => {
              // Reopen the modal if there's a duplicate error
              setIsModalOpen(true);
            });
          } else {
            setEditCat(null);
            setFormData({ doccatname: "", doccatdescription: "" });
            fetchCategories();
            Swal.fire(
              "Success",
              data.message || "Category saved successfully!",
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
        console.error("Error saving category:", err);
        setError(`Failed to save: ${err.message}`);
        Swal.fire(
          "Error",
          `Failed to save category: ${err.message}`,
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
        <Typography variant="h4">📂 Document Categories</Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="contained"
            onClick={openAddModal}
            disabled={isSaving}
          >
            + Add Category
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
          cats.length
        )}{" "}
        of {cats.length} entries
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

      {cats.length === 0 && !loading && (
        <Box sx={{ textAlign: "center", py: 3, color: "text.secondary" }}>
          No categories found
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
          {editCat ? "Edit Category" : "Add Category"}
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
            <TextField
              autoFocus
              margin="dense"
              name="doccatname"
              label="Category Name"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.doccatname}
              onChange={handleChange}
              required
              disabled={isSaving}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              name="doccatdescription"
              label="Description"
              type="text"
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              value={formData.doccatdescription}
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
              {editCat ? "Update" : "Save"}
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
            {editCat ? "Updating category..." : "Saving category..."}
          </Typography>
        </Box>
      </StyledBackdrop>
    </Box>
  );
}
