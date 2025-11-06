import React, { useState, useContext, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import {
  Download,
  Edit,
  Trash2,
  Users,
  X,
  Plus,
  Search,
  SortAsc,
  SortDesc,
} from "lucide-react";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";

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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  IconButton,
  CircularProgress,
  Tooltip,
  Collapse,
  TableCell,
  TableRow,
  TableContainer,
  Table,
  TableHead,
  TableBody,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { IPAdress } from "../Datafetching/IPAdrees";
import { KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material";

// Styled components for custom styling
const StyledPaper = styled(Paper)(({ theme }) => ({
  width: "100%",
  marginBottom: theme.spacing(2),
}));

const StyledChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.5),
}));

const LoadingOverlay = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(255, 255, 255, 0.7)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
}));

// Common date formatting function
const formatDate = (dateString) => {
  if (!dateString) return "-";

  try {
    const formattedDate = dateString.endsWith("Z")
      ? `${dateString.slice(0, -1)}T00:00:00Z`
      : dateString;

    return new Date(formattedDate).toLocaleDateString();
  } catch (error) {
    console.error("Error parsing date:", error);
    return dateString;
  }
};

// Row component for grouped data
const GroupedRow = ({ row, isExpanded, onToggle, onDelete, onEdit }) => {
  return (
    <>
      <TableRow sx={{ "& > *": { borderBottom: "unset" } }}>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => onToggle(row.id)}
          >
            {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2">{row.usersname}</Typography>
          </Box>
        </TableCell>
        <TableCell>{row.userscreatedby}</TableCell>
        <TableCell>
          {row.associations.length > 0 ? (
            <Typography variant="body2">
              {row.associations.length} compan
              {row.associations.length === 1 ? "y" : "ies"}
            </Typography>
          ) : (
            <Typography
              variant="body2"
              color="textSecondary"
              fontStyle="italic"
            >
              No companies associated
            </Typography>
          )}
        </TableCell>
        <TableCell>
          <IconButton size="small" onClick={() => onEdit(row)}>
            <Edit size={16} />
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Typography variant="h6" gutterBottom component="div">
                Companies
              </Typography>
              <Table size="small" aria-label="companies">
                <TableHead>
                  <TableRow>
                    <TableCell>Company Name</TableCell>
                    <TableCell>Associated By</TableCell>
                    <TableCell>Association Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {row.associations.map((assoc) => (
                    <TableRow key={assoc.usrincassnrecid}>
                      <TableCell component="th" scope="row">
                        {assoc.incubateesname}
                      </TableCell>
                      <TableCell>
                        {assoc.usrincassncreatedbyname || "N/A"}
                      </TableCell>
                      <TableCell>
                        {formatDate(assoc.usrincassncreatedtime)}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => onDelete(assoc.usrincassnrecid)}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

export default function UserAssociationTable() {
  const navigate = useNavigate();

  // Get IP address from your IPAdress file
  const IP = IPAdress;
  const userId = sessionStorage.getItem("userid");
  const token = sessionStorage.getItem("token");
  const incUserid = sessionStorage.getItem("incuserid");

  // States
  const [associations, setAssociations] = useState([]);
  const [incubatees, setIncubatees] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);
  const [selectedIncubatees, setSelectedIncubatees] = useState([]);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [showNewAssociationModal, setShowNewAssociationModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedIncubateesForNew, setSelectedIncubateesForNew] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRows, setExpandedRows] = useState([]);

  // Pagination state for Material UI
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });

  // Sorting state
  const [sortModel, setSortModel] = useState([
    {
      field: "usersname",
      sort: "asc",
    },
  ]);

  // Check if XLSX is available
  const isXLSXAvailable = !!XLSX;

  // Fetch user associations
  const fetchAssociations = () => {
    setLoading(true);
    setError(null);

    fetch(`${IP}/itelinc/resources/generic/getuserasslist`, {
      method: "POST",
      mode: "cors",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userId || null,
        incUserId: incUserid,
      }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data.statusCode === 200) {
          setAssociations(data.data || []);
        } else {
          throw new Error(data.message || "Failed to fetch user associations");
        }
      })
      .catch((err) => {
        console.error("Error fetching user associations:", err);
        setError("Failed to load user associations. Please try again.");
      })
      .finally(() => setLoading(false));
  };

  // Fetch incubatees list
  const fetchIncubatees = () => {
    fetch(`${IP}/itelinc/resources/generic/getinclist`, {
      method: "POST",
      mode: "cors",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userId || null,
        incUserId: incUserid,
      }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data.statusCode === 200) {
          setIncubatees(data.data || []);
        } else {
          throw new Error(data.message || "Failed to fetch incubatees");
        }
      })
      .catch((err) => {
        console.error("Error fetching incubatees:", err);
        Swal.fire("❌ Error", "Failed to load incubatees", "error");
      });
  };

  // Fetch users list
  const fetchUsers = () => {
    fetch(`${IP}/itelinc/resources/generic/getusers`, {
      method: "POST",
      mode: "cors",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userId || null,
        userIncId: incUserid,
      }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data.statusCode === 200) {
          setUsers(data.data || []);
        } else {
          throw new Error(data.message || "Failed to fetch users");
        }
      })
      .catch((err) => {
        console.error("Error fetching users:", err);
        Swal.fire("❌ Error", "Failed to load users", "error");
      });
  };

  useEffect(() => {
    fetchAssociations();
    fetchIncubatees();
    fetchUsers();
  }, []);

  // Normalize the associations data to handle both associated and unassociated users
  const normalizedData = useMemo(() => {
    const userMap = {};

    associations.forEach((item) => {
      if (item.usrincassnrecid) {
        const userId = item.usrincassnusersrecid;
        if (!userMap[userId]) {
          userMap[userId] = {
            id: userId,
            usersrecid: userId,
            usersname: item.usersname,
            userscreatedby: item.userscreatedby,
            associations: [],
          };
        }
        userMap[userId].associations.push({
          usrincassnrecid: item.usrincassnrecid,
          incubateesname: item.incubateesname,
          usrincassncreatedtime: item.usrincassncreatedtime,
          usrincassncreatedbyname: item.usrincassncreatedby,
          usrincassnmodifiedtime: item.usrincassnmodifiedtime,
          usrincassnincubateesrecid: item.usrincassnincubateesrecid,
        });
      } else {
        const userId = item.usersrecid;
        if (!userMap[userId]) {
          userMap[userId] = {
            id: userId,
            usersrecid: userId,
            usersname: item.usersname,
            userscreatedby: item.userscreatedby || "N/A",
            associations: [],
          };
        }
      }
    });

    return Object.values(userMap);
  }, [associations]);

  // Filter data using useMemo for performance
  const filteredData = useMemo(() => {
    return normalizedData.filter((user) => {
      const matchesSearch = (user.usersname || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [normalizedData, searchTerm]);

  // Handle row expansion
  const handleToggleRow = (rowId) => {
    setExpandedRows((prev) =>
      prev.includes(rowId)
        ? prev.filter((id) => id !== rowId)
        : [...prev, rowId]
    );
  };

  // Start editing a user's incubatees
  const startEditing = (user) => {
    setEditingUserId(user.usersrecid);
    const userIncubatees = user.associations.map(
      (assoc) => assoc.usrincassnincubateesrecid
    );
    setSelectedIncubatees(userIncubatees);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingUserId(null);
    setSelectedIncubatees([]);
  };

  // Cancel new association
  const cancelNewAssociation = () => {
    setShowNewAssociationModal(false);
    setSelectedUser("");
    setSelectedIncubateesForNew([]);
  };

  // Handle checkbox change for edit modal
  const handleCheckboxChange = (incubateeId) => {
    setSelectedIncubatees((prev) => {
      if (prev.includes(incubateeId)) {
        return prev.filter((id) => id !== incubateeId);
      } else {
        return [...prev, incubateeId];
      }
    });
  };

  // Handle checkbox change for new association modal
  const handleNewCheckboxChange = (incubateeId) => {
    setSelectedIncubateesForNew((prev) => {
      if (prev.includes(incubateeId)) {
        return prev.filter((id) => id !== incubateeId);
      } else {
        return [...prev, incubateeId];
      }
    });
  };

  // Handle user selection for new association
  const handleUserChange = (e) => {
    setSelectedUser(e.target.value);
  };

  // Update user associations
  const updateAssociations = () => {
    if (!editingUserId) return;

    setUpdateLoading(true);

    const currentUserAssociations = associations.filter(
      (assoc) => assoc.usrincassnusersrecid === editingUserId
    );

    const currentIncubateeIds = currentUserAssociations.map(
      (assoc) => assoc.usrincassnincubateesrecid
    );

    const toAdd = selectedIncubatees.filter(
      (id) => !currentIncubateeIds.includes(id)
    );
    const toRemove = currentUserAssociations.filter(
      (assoc) => !selectedIncubatees.includes(assoc.usrincassnincubateesrecid)
    );

    const addPromises = toAdd.map((incubateeId) => {
      const url = `${IP}/itelinc/addUserIncubationAssociation?usrincassnusersrecid=${editingUserId}&usrincassnincubateesrecid=${incubateeId}&usrincassncreatedby=${
        userId || "1"
      }&usrincassnmodifiedby=${userId || "1"}&usrincassnadminstate=1`;

      return fetch(url, {
        method: "POST",
        mode: "cors",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! Status: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          if (data.statusCode !== 200) {
            throw new Error(data.message || "Failed to add association");
          }
          return { success: true, incubateeId, action: "add" };
        })
        .catch((error) => {
          return {
            success: false,
            incubateeId,
            action: "add",
            error: error.message,
          };
        });
    });

    const removePromises = toRemove.map((association) => {
      const url = `${IP}/itelinc/deleteUserIncubationAssociation?usrincassnmodifiedby=${
        userId || "1"
      }&usrincassnrecid=${association.usrincassnrecid}`;

      return fetch(url, {
        method: "POST",
        mode: "cors",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! Status: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          if (data.statusCode !== 200) {
            throw new Error(data.message || "Failed to remove association");
          }
          return {
            success: true,
            associationId: association.usrincassnrecid,
            action: "remove",
          };
        })
        .catch((error) => {
          return {
            success: false,
            associationId: association.usrincassnrecid,
            action: "remove",
            error: error.message,
          };
        });
    });

    const allPromises = [...addPromises, ...removePromises];

    Promise.all(allPromises)
      .then((results) => {
        const successful = results.filter((r) => r.success);
        const failed = results.filter((r) => !r.success);

        if (failed.length === 0) {
          Swal.fire(
            "✅ Success",
            "User associations updated successfully!",
            "success"
          );
          fetchAssociations();
          cancelEditing();
        } else if (successful.length > 0) {
          const errorMessages = failed
            .map((f) => {
              if (f.action === "add") {
                return `Failed to add incubatee ${f.incubateeId}: ${f.error}`;
              } else {
                return `Failed to remove association ${f.associationId}: ${f.error}`;
              }
            })
            .join("<br>");

          Swal.fire({
            title: "⚠️ Partial Success",
            html: `${successful.length} operations succeeded, but ${failed.length} failed.<br><br>${errorMessages}`,
            icon: "warning",
          });
          fetchAssociations();
          cancelEditing();
        } else {
          const errorMessages = failed
            .map((f) => {
              if (f.action === "add") {
                return `Failed to add incubatee ${f.incubateeId}: ${f.error}`;
              } else {
                return `Failed to remove association ${f.associationId}: ${f.error}`;
              }
            })
            .join("<br>");

          Swal.fire({
            title: "❌ Error",
            html: `All operations failed.<br><br>${errorMessages}`,
            icon: "error",
          });
        }
      })
      .catch((err) => {
        console.error("Error updating user associations:", err);
        Swal.fire("❌ Error", "Failed to update user associations", "error");
      })
      .finally(() => {
        setUpdateLoading(false);
      });
  };

  // Create new user association
  const createNewAssociation = () => {
    if (!selectedUser || selectedIncubateesForNew.length === 0) {
      Swal.fire(
        "❌ Error",
        "Please select a user and at least one incubatee",
        "error"
      );
      return;
    }

    setUpdateLoading(true);

    const promises = selectedIncubateesForNew.map((incubateeId) => {
      const url = `${IP}/itelinc/addUserIncubationAssociation?usrincassnusersrecid=${selectedUser}&usrincassnincubateesrecid=${incubateeId}&usrincassncreatedby=${
        userId || "1"
      }&usrincassnmodifiedby=${userId || "1"}&usrincassnadminstate=1`;

      return fetch(url, {
        method: "POST",
        mode: "cors",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! Status: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          if (data.statusCode !== 200) {
            throw new Error(data.message || "Failed to create association");
          }
          return { success: true, incubateeId };
        })
        .catch((error) => {
          return { success: false, incubateeId, error: error.message };
        });
    });

    Promise.all(promises)
      .then((results) => {
        const successful = results.filter((r) => r.success);
        const failed = results.filter((r) => !r.success);

        if (failed.length === 0) {
          Swal.fire(
            "✅ Success",
            "All user associations created successfully!",
            "success"
          );
          fetchAssociations();
          cancelNewAssociation();
        } else if (successful.length > 0) {
          const errorMessages = failed
            .map((f) => `Incubatee ${f.incubateeId}: ${f.error}`)
            .join("<br>");
          Swal.fire({
            title: "⚠️ Partial Success",
            html: `${successful.length} associations created successfully, but ${failed.length} failed.<br><br>${errorMessages}`,
            icon: "warning",
          });
          fetchAssociations();
          cancelNewAssociation();
        } else {
          const errorMessages = failed
            .map((f) => `Incubatee ${f.incubateeId}: ${f.error}`)
            .join("<br>");
          Swal.fire({
            title: "❌ Error",
            html: `Failed to create any user associations.<br><br>${errorMessages}`,
            icon: "error",
          });
        }
      })
      .catch((err) => {
        console.error("Error creating user associations:", err);
        Swal.fire("❌ Error", "Failed to create user associations", "error");
      })
      .finally(() => {
        setUpdateLoading(false);
      });
  };

  // Delete association
  const handleDelete = (associationId) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This association will be deleted permanently.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
      showLoaderOnConfirm: true,
      preConfirm: () => {
        setIsDeleting(true);
        const url = `${IP}/itelinc/deleteUserIncubationAssociation?usrincassnmodifiedby=${
          userId || "1"
        }&usrincassnrecid=${associationId}`;

        return fetch(url, {
          method: "POST",
          mode: "cors",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        })
          .then((res) => {
            if (!res.ok) {
              throw new Error(`HTTP error! Status: ${res.status}`);
            }
            return res.json();
          })
          .then((data) => {
            if (data.statusCode === 200) {
              return data;
            } else {
              throw new Error(data.message || "Failed to delete association");
            }
          })
          .catch((error) => {
            Swal.showValidationMessage(`Request failed: ${error.message}`);
          })
          .finally(() => {
            setIsDeleting(false);
          });
      },
      allowOutsideClick: () => !Swal.isLoading(),
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire("Deleted!", "Association deleted successfully!", "success");
        fetchAssociations();
      }
    });
  };

  // Export to CSV function
  const exportToCSV = () => {
    // Create a copy of the data for export
    const exportData = normalizedData.flatMap((user) => {
      if (user.associations.length === 0) {
        return [
          {
            "User Name": user.usersname,
            "Created By": user.userscreatedby,
            Company: "No companies associated",
            "Associated By": "N/A",
            "Association Date": "N/A",
          },
        ];
      } else {
        return user.associations.map((assoc) => ({
          "User Name": user.usersname,
          "Created By": user.userscreatedby,
          Company: assoc.incubateesname,
          "Associated By": assoc.usrincassncreatedbyname || "N/A",
          "Association Date": formatDate(assoc.usrincassncreatedtime),
        }));
      }
    });

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
      `user_associations_${new Date().toISOString().slice(0, 10)}.csv`
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
      const exportData = normalizedData.flatMap((user) => {
        if (user.associations.length === 0) {
          return [
            {
              "User Name": user.usersname,
              "Created By": user.userscreatedby,
              Company: "No companies associated",
              "Associated By": "N/A",
              "Association Date": "N/A",
            },
          ];
        } else {
          return user.associations.map((assoc) => ({
            "User Name": user.usersname,
            "Created By": user.userscreatedby,
            Company: assoc.incubateesname,
            "Associated By": assoc.usrincassncreatedbyname || "N/A",
            "Association Date": formatDate(assoc.usrincassncreatedtime),
          }));
        }
      });

      // Create a workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(wb, ws, "User Associations");

      // Generate the Excel file and download
      XLSX.writeFile(
        wb,
        `user_associations_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Error exporting to Excel. Falling back to CSV export.");
      exportToCSV();
    }
  };

  // Pagination
  const paginatedData = useMemo(() => {
    const startIndex = paginationModel.page * paginationModel.pageSize;
    const endIndex = startIndex + paginationModel.pageSize;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, paginationModel]);

  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h5" display="flex" alignItems="center">
          <Users style={{ marginRight: "8px" }} />
          Operator–Incubatee Associations list
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          {/* <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={() => setShowNewAssociationModal(true)}
          >
            New Association
          </Button> */}
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
          p={2}
          bgcolor="error.main"
          color="error.contrastText"
          borderRadius={1}
          mb={2}
        >
          {error}
        </Box>
      )}

      {/* Search Section */}
      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <TextField
          label="Search by name..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ minWidth: 250 }}
          InputProps={{
            startAdornment: <Search size={16} style={{ marginRight: 8 }} />,
          }}
        />

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
        of {filteredData.length} entries
      </Box>

      {/* Table with Grouping */}
      <StyledPaper>
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table aria-label="collapsible table">
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell>Name</TableCell>
                  <TableCell>Created By</TableCell>
                  <TableCell>Companies</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedData.map((row) => (
                  <GroupedRow
                    key={row.id}
                    row={row}
                    isExpanded={expandedRows.includes(row.id)}
                    onToggle={handleToggleRow}
                    onDelete={handleDelete}
                    onEdit={startEditing}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </StyledPaper>

      {/* Pagination Controls */}
      <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
        <Button
          disabled={paginationModel.page === 0}
          onClick={() =>
            setPaginationModel({
              ...paginationModel,
              page: paginationModel.page - 1,
            })
          }
        >
          Previous
        </Button>
        <Typography sx={{ mx: 2 }}>
          Page {paginationModel.page + 1} of{" "}
          {Math.ceil(filteredData.length / paginationModel.pageSize)}
        </Typography>
        <Button
          disabled={
            paginationModel.page >=
            Math.ceil(filteredData.length / paginationModel.pageSize) - 1
          }
          onClick={() =>
            setPaginationModel({
              ...paginationModel,
              page: paginationModel.page + 1,
            })
          }
        >
          Next
        </Button>
      </Box>

      {filteredData.length === 0 && !loading && (
        <Box sx={{ textAlign: "center", py: 3, color: "text.secondary" }}>
          {searchTerm
            ? "No users found matching your search"
            : "No users found"}
        </Box>
      )}

      {/* Edit Modal */}
      <Dialog
        open={!!editingUserId}
        onClose={cancelEditing}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit User Associations</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="h6" gutterBottom>
              Select Incubatees:
            </Typography>
            <Box
              sx={{
                maxHeight: 300,
                overflow: "auto",
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                p: 1,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {incubatees.map((incubatee) => (
                <FormControlLabel
                  key={incubatee.incubateesrecid}
                  control={
                    <Checkbox
                      checked={selectedIncubatees.includes(
                        incubatee.incubateesrecid
                      )}
                      onChange={() =>
                        handleCheckboxChange(incubatee.incubateesrecid)
                      }
                      disabled={updateLoading}
                    />
                  }
                  label={incubatee.incubateesname}
                />
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelEditing} disabled={updateLoading}>
            Cancel
          </Button>
          <Button
            onClick={updateAssociations}
            variant="contained"
            disabled={updateLoading}
            startIcon={updateLoading ? <CircularProgress size={16} /> : null}
          >
            {updateLoading ? "Updating..." : "Save Changes"}
          </Button>
        </DialogActions>
        {updateLoading && (
          <LoadingOverlay>
            <CircularProgress />
          </LoadingOverlay>
        )}
      </Dialog>

      {/* New Association Modal */}
      <Dialog
        open={showNewAssociationModal}
        onClose={cancelNewAssociation}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Associate New Operator</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="user-select-label">Select User</InputLabel>
              <Select
                labelId="user-select-label"
                value={selectedUser}
                onChange={handleUserChange}
                disabled={updateLoading}
              >
                <MenuItem value="">-- Select User --</MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.usersrecid} value={user.usersrecid}>
                    {user.usersname}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography variant="h6" gutterBottom>
              Select Incubatees:
            </Typography>
            <Box
              sx={{
                maxHeight: 300,
                overflow: "auto",
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                p: 1,
              }}
            >
              {incubatees.map((incubatee) => (
                <FormControlLabel
                  key={incubatee.incubateesrecid}
                  control={
                    <Checkbox
                      checked={selectedIncubateesForNew.includes(
                        incubatee.incubateesrecid
                      )}
                      onChange={() =>
                        handleNewCheckboxChange(incubatee.incubateesrecid)
                      }
                      disabled={updateLoading}
                    />
                  }
                  label={incubatee.incubateesname}
                />
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelNewAssociation} disabled={updateLoading}>
            Cancel
          </Button>
          <Button
            onClick={createNewAssociation}
            variant="contained"
            disabled={updateLoading}
            startIcon={updateLoading ? <CircularProgress size={16} /> : null}
          >
            {updateLoading ? "Creating..." : "Create Association"}
          </Button>
        </DialogActions>
        {updateLoading && (
          <LoadingOverlay>
            <CircularProgress />
          </LoadingOverlay>
        )}
      </Dialog>
    </Box>
  );
}
