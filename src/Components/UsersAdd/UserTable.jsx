import React, { useEffect, useState, useMemo } from "react";
import Swal from "sweetalert2";
import { FaTrash, FaEdit, FaPlus, FaSpinner } from "react-icons/fa";
import { Download } from "lucide-react";
import "./UserTable.css";
import { IPAdress } from "../Datafetching/IPAdrees";
import * as XLSX from "xlsx";

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
  IconButton,
  Chip,
  CircularProgress,
  Backdrop,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

// Styled components
const StyledPaper = styled(Paper)(({ theme }) => ({
  // height: 600,
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
  "&.disabled": {
    backgroundColor: theme.palette.grey[300],
    color: theme.palette.grey[500],
    cursor: "not-allowed",
  },
}));

export default function UserTable() {
  const userId = sessionStorage.getItem("userid");
  const token = sessionStorage.getItem("token");
  const incUserid = sessionStorage.getItem("incuserid");
  const roleId = sessionStorage.getItem("roleid");
  const IP = IPAdress;
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roles, setRoles] = useState([]);
  const [incubatees, setIncubatees] = useState([]);
  const [incubations, setIncubations] = useState([]);
  const [dropdownsLoading, setDropdownsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIncubation, setSelectedIncubation] = useState(null);

  // Pagination state for Material UI
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 5,
  });

  // Loading states for operations
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(null);
  const [isDeleting, setIsDeleting] = useState(null);

  // Check if XLSX is available
  const isXLSXAvailable = !!XLSX;

  // Define the role IDs that are allowed to select an incubatee
  const INCUBATEE_ROLE_IDS = [4, 5, 6];
  const rolebaseincuserid = roleId === "0" ? 1 : incUserid;

  // Check if current user can select incubation (only when roleId is 0)
  const canSelectIncubation = roleId === "0";

  // Check if incubatee dropdown should be enabled
  const isIncubateeEnabled = selectedIncubation !== null;

  // Function to map role ID to the correct role name
  const getRoleName = (roleId) => {
    const roleMap = {
      1: "Incubator admin",
      2: "Incubator manager",
      3: "Incubator operator",
      4: "Incubatee admin",
      5: "Incubatee manager",
      6: "Incubatee operator",
      7: "DDI admin",
      8: "DDI manager",
    };
    return roleMap[roleId] || "Unknown Role";
  };

  // Function to format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      // Handle ISO format dates
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr; // Return original if invalid date

      // Format to readable format
      return date
        .toLocaleString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false, // Use 24-hour format
        })
        .replace(",", ""); // Remove the comma between date and time
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateStr; // Return original if error
    }
  };

  // Function to filter users based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter((user) =>
        user.usersname.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  // Function to clear search
  const clearSearch = () => {
    setSearchQuery("");
  };

  // Function to handle incubation selection
  const handleIncubationSelect = (incubation) => {
    setSelectedIncubation(incubation);
  };

  // Export to CSV function
  const exportToCSV = () => {
    // Create a copy of the data for export
    const exportData = filteredUsers.map((user, index) => ({
      "S.No": index + 1,
      Name: user.usersname || "",
      Email: user.usersemail || "",
      Role: getRoleName(user.usersrolesrecid),
      "Created Time": formatDate(user.userscreatedtime),
      "Modified Time": formatDate(user.usersmodifiedtime),
      "Created By": user.userscreatedby || "",
      "Modified By": user.usersmodifiedby || "",
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
      `users_${new Date().toISOString().slice(0, 10)}.csv`
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
      const exportData = filteredUsers.map((user, index) => ({
        "S.No": index + 1,
        Name: user.usersname || "",
        Email: user.usersemail || "",
        Role: getRoleName(user.usersrolesrecid),
        "Created Time": formatDate(user.userscreatedtime),
        "Modified Time": formatDate(user.usersmodifiedtime),
        "Created By": user.userscreatedby || "",
        "Modified By": user.usersmodifiedby || "",
      }));

      // Create a workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(wb, ws, "Users");

      // Generate the Excel file and download
      XLSX.writeFile(wb, `users_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
      field: "usersname",
      headerName: "Name",
      width: 150,
      sortable: true,
    },
    {
      field: "usersemail",
      headerName: "Email",
      width: 200,
      sortable: true,
    },
    {
      field: "usersrolesrecid",
      headerName: "Role Name",
      width: 180,
      sortable: true,
      valueGetter: (params) => {
        if (!params || !params.row) return "Unknown Role";
        return getRoleName(params.row.usersrolesrecid);
      },
      renderCell: (params) => {
        if (!params || !params.row)
          return <Chip label="Unknown Role" size="small" />;
        return (
          <Chip
            label={getRoleName(params.row.usersrolesrecid)}
            size="small"
            variant="outlined"
          />
        );
      },
    },
    {
      field: "userscreatedtime",
      headerName: "Created Time",
      width: 180,
      sortable: true,
      valueGetter: (params) => {
        // Keep this for sorting purposes
        if (!params || !params.row) return null;
        return params.row.userscreatedtime
          ? new Date(params.row.userscreatedtime)
          : null;
      },
      renderCell: (params) => {
        // Use this for display
        if (!params || !params.row) return "-";
        return formatDate(params.row.userscreatedtime);
      },
      sortComparator: (v1, v2) => {
        // Custom sort comparator for dates
        const date1 = v1 || new Date(0);
        const date2 = v2 || new Date(0);
        return date1.getTime() - date2.getTime();
      },
    },
    {
      field: "usersmodifiedtime",
      headerName: "Modified Time",
      width: 180,
      sortable: true,
      valueGetter: (params) => {
        // Keep this for sorting purposes
        if (!params || !params.row) return null;
        return params.row.usersmodifiedtime
          ? new Date(params.row.usersmodifiedtime)
          : null;
      },
      renderCell: (params) => {
        // Use this for display
        if (!params || !params.row) return "-";
        return formatDate(params.row.usersmodifiedtime);
      },
      sortComparator: (v1, v2) => {
        // Custom sort comparator for dates
        const date1 = v1 || new Date(0);
        const date2 = v2 || new Date(0);
        return date1.getTime() - date2.getTime();
      },
    },
    {
      field: "userscreatedby",
      headerName: "Created By",
      width: 120,
      sortable: true,
    },
    {
      field: "usersmodifiedby",
      headerName: "Modified By",
      width: 120,
      sortable: true,
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 150,
      sortable: false,
      renderCell: (params) => {
        if (!params || !params.row) return null;

        const shouldDisableDelete =
          params.row.usersrolesrecid === 4 || params.row.usersrolesrecid === 1;

        return (
          <Box>
            <ActionButton
              color="edit"
              onClick={() => handleEdit(params.row)}
              disabled={
                isUpdating === params.row.usersrecid ||
                isDeleting === params.row.usersrecid
              }
              title="Edit"
            >
              {isUpdating === params.row.usersrecid ? (
                <FaSpinner className="spinner" size={18} />
              ) : (
                <EditIcon fontSize="small" />
              )}
            </ActionButton>
            <ActionButton
              color="delete"
              onClick={() => handleDelete(params.row)}
              disabled={
                isDeleting === params.row.usersrecid ||
                isUpdating === params.row.usersrecid ||
                shouldDisableDelete
              }
              className={shouldDisableDelete ? "disabled" : ""}
              title={
                shouldDisableDelete
                  ? "Cannot delete users with role ID 1 or 4"
                  : "Delete"
              }
            >
              {isDeleting === params.row.usersrecid ? (
                <FaSpinner className="spinner" size={18} />
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
    return filteredUsers.map((user, index) => ({
      ...user,
      id: user.usersrecid || `user-${index}`,
    }));
  }, [filteredUsers]);

  // Fetch all users
  const fetchUsers = () => {
    setLoading(true);
    setError(null);
    fetch(`${IP}/itelinc/resources/generic/getusers`, {
      method: "POST",
      mode: "cors",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userId || null,
        userIncId: selectedIncubation
          ? selectedIncubation.incubationsrecid
          : incUserid,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.statusCode === 200) {
          const userData = data.data || [];
          console.log("Fetched users:", userData); // Debug log
          setUsers(userData);
          setFilteredUsers(userData);
        } else {
          throw new Error(data.message || "Failed to fetch users");
        }
      })
      .catch((err) => {
        console.error("Error fetching users:", err);
        setError("Failed to load users. Please try again.");
      })
      .finally(() => setLoading(false));
  };

  // Fetch roles for dropdown
  const fetchRoles = () => {
    return fetch(`${IP}/itelinc/resources/generic/getrolelist`, {
      method: "POST",
      mode: "cors",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userId || null,
        incUserId: selectedIncubation
          ? selectedIncubation.incubationsrecid
          : incUserid,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.statusCode === 200) {
          // Map the roles to ensure correct display names
          const mappedRoles = (data.data || []).map((role) => ({
            ...role,
            text: getRoleName(role.value),
          }));
          setRoles(mappedRoles);
          return mappedRoles;
        } else {
          throw new Error(data.message || "Failed to fetch roles");
        }
      })
      .catch((err) => {
        console.error("Error fetching roles:", err);
        Swal.fire("❌ Error", "Failed to load roles", "error");
        return [];
      });
  };

  // Fetch incubatees for dropdown
  const fetchIncubatees = (incubationId = null) => {
    // Use the provided incubationId or the selectedIncubation
    const targetIncubationId =
      incubationId ||
      (selectedIncubation ? selectedIncubation.incubationsrecid : incUserid);

    return fetch(`${IP}/itelinc/resources/generic/getinclist`, {
      method: "POST",
      mode: "cors",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userId || null,
        incUserId: targetIncubationId,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.statusCode === 200) {
          setIncubatees(data.data || []);
          return data.data || [];
        } else {
          throw new Error(data.message || "Failed to fetch incubatees");
        }
      })
      .catch((err) => {
        console.error("Error fetching incubatees:", err);
        Swal.fire("❌ Error", "Failed to load incubatees", "error");
        return [];
      });
  };

  // Fetch incubations for dropdown (only if roleId is 0)
  const fetchIncubations = () => {
    if (!canSelectIncubation) {
      // If roleId is not 0, we don't need to fetch incubations
      return Promise.resolve([]);
    }

    return fetch(`${IP}/itelinc/resources/generic/getincubationlist`, {
      method: "POST",
      mode: "cors",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userId || null,
        userIncId: "ALL", // Use "ALL" to get all incubations
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.statusCode === 200) {
          setIncubations(data.data || []);
          return data.data || [];
        } else {
          throw new Error(data.message || "Failed to fetch incubations");
        }
      })
      .catch((err) => {
        console.error("Error fetching incubations:", err);
        Swal.fire("❌ Error", "Failed to load incubations", "error");
        return [];
      });
  };

  // Fetch all required data
  useEffect(() => {
    fetchUsers();
    // Load dropdown data on component mount
    setDropdownsLoading(true);
    Promise.all([fetchRoles(), fetchIncubatees(), fetchIncubations()])
      .then(() => setDropdownsLoading(false))
      .catch(() => setDropdownsLoading(false));
  }, []);

  // Refetch data when selectedIncubation changes
  useEffect(() => {
    // Fetch users and roles when selectedIncubation changes
    fetchUsers();
    fetchRoles();

    // Fetch incubatees only when an incubation is selected
    if (selectedIncubation) {
      setDropdownsLoading(true);
      fetchIncubatees()
        .then(() => setDropdownsLoading(false))
        .catch(() => setDropdownsLoading(false));
    } else {
      // Clear incubatees when no incubation is selected
      setIncubatees([]);
    }
  }, [selectedIncubation]);

  // Delete user
  const handleDelete = (user) => {
    Swal.fire({
      title: "Are you sure?",
      text: `You are about to delete ${user.usersname}. This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        setIsDeleting(user.usersrecid);
        const deleteUrl = `${IP}/itelinc/deleteUser?usersmodifiedby=${
          userId || "system"
        }&usersrecid=${user.usersrecid}`;

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
                `${user.usersname} has been deleted successfully.`,
                "success"
              );
              fetchUsers(); // Refresh the user list
            } else {
              throw new Error(data.message || "Failed to delete user");
            }
          })
          .catch((err) => {
            console.error("Error deleting user:", err);
            Swal.fire(
              "Error",
              `Failed to delete ${user.usersname}: ${err.message}`,
              "error"
            );
          })
          .finally(() => {
            setIsDeleting(null);
          });
      }
    });
  };

  // Add new user
  const handleAddUser = async () => {
    // Check if dropdown data is loaded, if not, wait for it
    if (
      dropdownsLoading ||
      roles.length === 0 ||
      (canSelectIncubation && incubations.length === 0)
    ) {
      Swal.fire({
        title: "Loading...",
        text: "Please wait while we load the required data",
        icon: "info",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
      });

      try {
        await Promise.all([
          fetchRoles(),
          fetchIncubatees(),
          fetchIncubations(),
        ]);
        setDropdownsLoading(false);
        Swal.close();
      } catch (error) {
        Swal.close();
        Swal.fire("❌ Error", "Failed to load dropdown data", "error");
        return;
      }
    }

    // Create role dropdown HTML with mapped role names
    const roleOptions = roles
      .map((role) => `<option value="${role.value}">${role.text}</option>`)
      .join("");

    // Create incubation dropdown HTML with "Select incubation" as placeholder (only if roleId is 0)
    const incubationOptions = canSelectIncubation
      ? [
          `<option value="" disabled selected>Select incubation</option>`,
          ...incubations.map(
            (incubation) =>
              `<option value="${incubation.incubationsrecid}">${incubation.incubationshortname}</option>`
          ),
        ].join("")
      : "";

    // Create incubatee dropdown HTML with "Select incubatee" as placeholder
    const incubateeOptions = [
      `<option value="" disabled selected>Select incubatee</option>`,
      ...incubatees.map(
        (incubatee) =>
          `<option value="${incubatee.incubateesrecid}">${incubatee.incubateesname}</option>`
      ),
    ].join("");

    Swal.fire({
      title: "Add New User",
      html: `
        <div class="swal-form-container">
          <div class="swal-form-row">
            <input id="swal-name" class="swal2-input" placeholder="Name" required>
          </div>
          <div class="swal-form-row">
            <input id="swal-email" class="swal2-input" placeholder="Email" required>
          </div>
          <div class="swal-form-row">
            <input id="swal-password" type="password" class="swal2-input" placeholder="Password" required>
          </div>
          <div class="swal-form-row">
            <select id="swal-role" class="swal2-select" required>
              <option value="" disabled selected>Select a role</option>
              ${roleOptions}
            </select>
          </div>
          ${
            canSelectIncubation
              ? `
          <div class="swal-form-row">
            <select id="swal-incubation" class="swal2-select" required>
              ${incubationOptions}
            </select>
          </div>
          `
              : ""
          }
          <div class="swal-form-row">
            <select id="swal-incubatee" class="swal2-select" disabled>
              ${incubateeOptions}
            </select>
          </div>
        </div>
      `,
      width: "600px",
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        const name = document.getElementById("swal-name");
        const email = document.getElementById("swal-email");
        const password = document.getElementById("swal-password");
        const role = document.getElementById("swal-role");
        const incubation = canSelectIncubation
          ? document.getElementById("swal-incubation")
          : null;
        const incubatee = document.getElementById("swal-incubatee");

        if (
          !name ||
          !email ||
          !password ||
          !role ||
          !incubatee ||
          (canSelectIncubation && !incubation)
        ) {
          Swal.showValidationMessage("Form elements not found");
          return false;
        }

        if (
          !name.value ||
          !email.value ||
          !password.value ||
          !role.value ||
          (canSelectIncubation && !incubation.value)
        ) {
          Swal.showValidationMessage("Please fill all required fields");
          return false;
        }

        return {
          usersname: name.value,
          usersemail: email.value,
          userspassword: password.value,
          usersrolesrecid: role.value,
          usersincubationsrecid: canSelectIncubation
            ? incubation.value
            : selectedIncubation
            ? selectedIncubation.incubationsrecid
            : incUserid,
          usersincubateesrecid: incubatee.value || null,
        };
      },
      didOpen: () => {
        // Add custom CSS for better styling
        const style = document.createElement("style");
        style.textContent = `
          .swal-form-container {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .swal-form-row {
            width: 100%;
          }
          .swal2-input, .swal2-select {
            width: 100% !important;
            margin: 0 !important;
          }
          .swal2-select {
            padding: 0.75em !important;
          }
          select:disabled {
            background-color: #f8f9fa;
            cursor: not-allowed;
            opacity: 0.8;
          }
        `;
        document.head.appendChild(style);

        // Get form elements
        const roleSelect = document.getElementById("swal-role");
        const incubateeSelect = document.getElementById("swal-incubatee");
        const incubationSelect = canSelectIncubation
          ? document.getElementById("swal-incubation")
          : null;

        // Function to update incubatee dropdown options
        const updateIncubateeOptions = (incubationId) => {
          if (!incubationId) {
            incubateeSelect.innerHTML =
              '<option value="" disabled selected>Select incubatee</option>';
            return;
          }

          // Show loading state
          incubateeSelect.innerHTML =
            '<option value="" disabled>Loading incubatees...</option>';
          incubateeSelect.disabled = true;

          // Fetch incubatees for the selected incubation
          fetch(`${IP}/itelinc/resources/generic/getinclist`, {
            method: "POST",
            mode: "cors",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: userId || null,
              incUserId: incubationId,
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.statusCode === 200) {
                const incubateeOptions = [
                  '<option value="" disabled selected>Select incubatee</option>',
                  ...(data.data || []).map(
                    (incubatee) =>
                      `<option value="${incubatee.incubateesrecid}">${incubatee.incubateesname}</option>`
                  ),
                ].join("");
                incubateeSelect.innerHTML = incubateeOptions;
              } else {
                incubateeSelect.innerHTML =
                  '<option value="" disabled>No incubatees found</option>';
              }
            })
            .catch((err) => {
              console.error("Error fetching incubatees:", err);
              incubateeSelect.innerHTML =
                '<option value="" disabled>Error loading incubatees</option>';
            });
        };

        const toggleIncubateeDropdown = () => {
          const selectedRole = parseInt(roleSelect.value);

          // For users with roleId === 0, check if incubation is selected
          // For other users, just check if the role allows selecting an incubatee
          const shouldEnableIncubatee = canSelectIncubation
            ? incubationSelect && incubationSelect.value !== ""
            : INCUBATEE_ROLE_IDS.includes(selectedRole);

          if (shouldEnableIncubatee) {
            // Update incubatee options based on selected incubation
            if (canSelectIncubation && incubationSelect) {
              updateIncubateeOptions(incubationSelect.value);
            } else {
              // For non-admin users, use their incUserid
              updateIncubateeOptions(incUserid);
            }
            incubateeSelect.disabled = false;
          } else {
            incubateeSelect.disabled = true;
            incubateeSelect.value = ""; // Reset selection when disabled
          }
        };

        // Add event listeners
        roleSelect.addEventListener("change", toggleIncubateeDropdown);

        // Add event listener to incubation dropdown if it exists
        if (incubationSelect) {
          incubationSelect.addEventListener("change", () => {
            const selectedRole = parseInt(roleSelect.value);
            if (INCUBATEE_ROLE_IDS.includes(selectedRole)) {
              updateIncubateeOptions(incubationSelect.value);
              incubateeSelect.disabled = false;
            }
          });
        }

        // Initial check
        toggleIncubateeDropdown();
      },
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const formData = result.value;
        setIsAdding(true);

        // Build URL with query parameters for adding user
        const params = new URLSearchParams();
        params.append("usersemail", formData.usersemail);
        params.append("userspassword", formData.userspassword);
        params.append("usersname", formData.usersname);
        params.append("usersrolesrecid", formData.usersrolesrecid);
        params.append("usersadminstate", "1");
        params.append("userscreatedby", userId || "system");
        params.append("usersmodifiedby", userId || "system");
        params.append("usersincubationsrecid", formData.usersincubationsrecid);

        // Only add incubateesrecid if it's not null or empty
        if (formData.usersincubateesrecid) {
          params.append("usersincubateesrecid", formData.usersincubateesrecid);
        }

        const addUrl = `${IP}/itelinc/addUser?${params.toString()}`;
        fetch(addUrl, {
          method: "POST",
          mode: "cors",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        })
          .then((res) => {
            if (!res.ok) {
              throw new Error(`HTTP error! Status: ${res.status}`);
            }
            return res.json();
          })
          .then((data) => {
            if (data.statusCode === 200) {
              Swal.fire("✅ Success", "User added successfully", "success");
              fetchUsers();
            } else {
              Swal.fire(
                "❌ Error",
                data.message || "Failed to add user",
                "error"
              );
            }
          })
          .catch((err) => {
            console.error("Error adding user:", err);
            if (
              err.name === "TypeError" &&
              err.message.includes("Failed to fetch")
            ) {
              Swal.fire(
                "❌ CORS Error",
                "Unable to connect to the server. This might be a CORS issue. Please contact your system administrator.",
                "error"
              );
            } else {
              Swal.fire(
                "❌ Error",
                err.message || "Something went wrong",
                "error"
              );
            }
          })
          .finally(() => {
            setIsAdding(false);
          });
      }
    });
  };

  // Edit user with popup form
  const handleEdit = async (user) => {
    // Check if dropdown data is loaded, if not, wait for it
    if (
      dropdownsLoading ||
      roles.length === 0 ||
      incubatees.length === 0 ||
      (canSelectIncubation && incubations.length === 0)
    ) {
      Swal.fire({
        title: "Loading...",
        text: "Please wait while we load the required data",
        icon: "info",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
      });

      try {
        await Promise.all([
          fetchRoles(),
          fetchIncubatees(),
          fetchIncubations(),
        ]);
        setDropdownsLoading(false);
        Swal.close();
      } catch (error) {
        Swal.close();
        Swal.fire("❌ Error", "Failed to load dropdown data", "error");
        return;
      }
    }

    // Create role dropdown HTML with mapped role names
    const roleOptions = roles
      .map(
        (role) =>
          `<option value="${role.value}" ${
            user.usersrolesrecid == role.value ? "selected" : ""
          }>${role.text}</option>`
      )
      .join("");

    // Create incubation dropdown HTML with "Select incubation" as placeholder (only if roleId is 0)
    const incubationOptions = canSelectIncubation
      ? [
          `<option value="" ${
            !user.usersincubationsrecid ? "selected" : ""
          }>Select incubation</option>`,
          ...incubations.map(
            (incubation) =>
              `<option value="${incubation.incubationsrecid}" ${
                user.usersincubationsrecid == incubation.incubationsrecid
                  ? "selected"
                  : ""
              }>${incubation.incubationshortname}</option>`
          ),
        ].join("")
      : "";

    // Create incubatee dropdown HTML with "Select incubatee" as placeholder
    const incubateeOptions = [
      `<option value="" ${
        !user.usersincubateesrecid ? "selected" : ""
      }>Select incubatee</option>`,
      ...incubatees.map(
        (incubatee) =>
          `<option value="${incubatee.incubateesrecid}" ${
            user.usersincubateesrecid == incubatee.incubateesrecid
              ? "selected"
              : ""
          }>${incubatee.incubateesname}</option>`
      ),
    ].join("");

    Swal.fire({
      title: "Edit User",
      html: `
        <div class="swal-form-container">
          <div class="swal-form-row">
            <input id="swal-name" class="swal2-input" placeholder="Name" value="${
              user.usersname || ""
            }">
          </div>
          <div class="swal-form-row">
            <input id="swal-email" class="swal2-input" placeholder="Email" value="${
              user.usersemail || ""
            }">
          </div>
          <div class="swal-form-row">
            <input id="swal-password" type="password" class="swal2-input" placeholder="Password" value="${
              user.userspassword || ""
            }" readonly>
          </div>
          <div class="swal-form-row">
            <select id="swal-role" class="swal2-select">
              ${roleOptions}
            </select>
          </div>
          ${
            canSelectIncubation
              ? `
          <div class="swal-form-row">
            <select id="swal-incubation" class="swal2-select">
              ${incubationOptions}
            </select>
          </div>
          `
              : ""
          }
          <div class="swal-form-row">
            <select id="swal-incubatee" class="swal2-select" ${
              !INCUBATEE_ROLE_IDS.includes(parseInt(user.usersrolesrecid))
                ? "disabled"
                : ""
            }>
              ${incubateeOptions}
            </select>
          </div>
        </div>
      `,
      width: "600px",
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        // Get all form values
        const name = document.getElementById("swal-name");
        const email = document.getElementById("swal-email");
        const password = document.getElementById("swal-password");
        const role = document.getElementById("swal-role");
        const incubation = canSelectIncubation
          ? document.getElementById("swal-incubation")
          : null;
        const incubatee = document.getElementById("swal-incubatee");

        // Validate that all elements exist
        if (
          !name ||
          !email ||
          !password ||
          !role ||
          !incubatee ||
          (canSelectIncubation && !incubation)
        ) {
          Swal.showValidationMessage("Form elements not found");
          return false;
        }

        return {
          usersname: name.value,
          usersemail: email.value,
          userspassword: password.value,
          usersrolesrecid: role.value,
          usersincubationsrecid: canSelectIncubation
            ? incubation.value
            : selectedIncubation
            ? selectedIncubation.incubationsrecid
            : incUserid,
          usersincubateesrecid: incubatee.value || null,
        };
      },
      didOpen: () => {
        // Add custom CSS for better styling
        const style = document.createElement("style");
        style.textContent = `
          .swal-form-container {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .swal-form-row {
            width: 100%;
          }
          .swal2-input, .swal2-select {
            width: 100% !important;
            margin: 0 !important;
          }
          .swal2-select {
            padding: 0.75em !important;
          }
          input[readonly] {
            background-color: #f8f9fa;
            cursor: not-allowed;
            opacity: 0.8;
          }
          select:disabled {
            background-color: #f8f9fa;
            cursor: not-allowed;
            opacity: 0.8;
          }
        `;
        document.head.appendChild(style);

        // Get form elements
        const roleSelect = document.getElementById("swal-role");
        const incubateeSelect = document.getElementById("swal-incubatee");
        const incubationSelect = canSelectIncubation
          ? document.getElementById("swal-incubation")
          : null;

        // Function to update incubatee dropdown options
        const updateIncubateeOptions = (incubationId) => {
          if (!incubationId) {
            incubateeSelect.innerHTML =
              '<option value="" disabled selected>Select incubatee</option>';
            return;
          }

          // Show loading state
          incubateeSelect.innerHTML =
            '<option value="" disabled>Loading incubatees...</option>';
          incubateeSelect.disabled = true;

          // Fetch incubatees for the selected incubation
          fetch(`${IP}/itelinc/resources/generic/getinclist`, {
            method: "POST",
            mode: "cors",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: userId || null,
              incUserId: incubationId,
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.statusCode === 200) {
                const incubateeOptions = [
                  '<option value="" disabled selected>Select incubatee</option>',
                  ...(data.data || []).map(
                    (incubatee) =>
                      `<option value="${incubatee.incubateesrecid}">${incubatee.incubateesname}</option>`
                  ),
                ].join("");
                incubateeSelect.innerHTML = incubateeOptions;
              } else {
                incubateeSelect.innerHTML =
                  '<option value="" disabled>No incubatees found</option>';
              }
            })
            .catch((err) => {
              console.error("Error fetching incubatees:", err);
              incubateeSelect.innerHTML =
                '<option value="" disabled>Error loading incubatees</option>';
            });
        };

        const toggleIncubateeDropdown = () => {
          const selectedRole = parseInt(roleSelect.value);

          // For users with roleId === 0, check if incubation is selected
          // For other users, just check if the role allows selecting an incubatee
          const shouldEnableIncubatee = canSelectIncubation
            ? incubationSelect && incubationSelect.value !== ""
            : INCUBATEE_ROLE_IDS.includes(selectedRole);

          if (shouldEnableIncubatee) {
            // Update incubatee options based on selected incubation
            if (canSelectIncubation && incubationSelect) {
              updateIncubateeOptions(incubationSelect.value);
            } else {
              // For non-admin users, use their incUserid
              updateIncubateeOptions(incUserid);
            }
            incubateeSelect.disabled = false;
          } else {
            incubateeSelect.disabled = true;
            incubateeSelect.value = ""; // Reset selection when disabled
          }
        };

        // Add event listeners
        roleSelect.addEventListener("change", toggleIncubateeDropdown);

        // Add event listener to incubation dropdown if it exists
        if (incubationSelect) {
          incubationSelect.addEventListener("change", () => {
            const selectedRole = parseInt(roleSelect.value);
            if (INCUBATEE_ROLE_IDS.includes(selectedRole)) {
              updateIncubateeOptions(incubationSelect.value);
              incubateeSelect.disabled = false;
            }
          });
        }

        // Initial check
        toggleIncubateeDropdown();
      },
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const formData = result.value;
        setIsUpdating(user.usersrecid);

        // Build URL with query parameters
        const params = new URLSearchParams();
        params.append("usersemail", formData.usersemail);
        params.append("usersname", formData.usersname);
        params.append("usersrolesrecid", formData.usersrolesrecid);
        params.append("userspassword", formData.userspassword);
        params.append("usersadminstate", "1");
        params.append("usersmodifiedby", userId);
        params.append("usersrecid", user.usersrecid);
        params.append("usersincubationsrecid", formData.usersincubationsrecid);

        // Only add incubateesrecid if it's not null or empty
        if (formData.usersincubateesrecid) {
          params.append("usersincubateesrecid", formData.usersincubateesrecid);
        }

        const updateUrl = `${IP}/itelinc/updateUser?${params.toString()}`;
        fetch(updateUrl, {
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
              Swal.fire("✅ Success", "User updated successfully", "success");
              fetchUsers();
            } else {
              Swal.fire(
                "❌ Error",
                data.message || "Failed to update user",
                "error"
              );
            }
          })
          .catch((err) => {
            console.error("Error updating user:", err);
            if (
              err.name === "TypeError" &&
              err.message.includes("Failed to fetch")
            ) {
              Swal.fire(
                "❌ CORS Error",
                "Unable to connect to the server. This might be a CORS issue. Please contact your system administrator.",
                "error"
              );
            } else {
              Swal.fire("❌ Error", "Something went wrong", "error");
            }
          })
          .finally(() => {
            setIsUpdating(null);
          });
      }
    });
  };

  return (
    <Box className="doccat-container" sx={{ p: 2 }}>
      <Box
        className="doccat-header"
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h4">👤 Users</Typography>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <TextField
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{ minWidth: 250 }}
            InputProps={{
              startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
              endAdornment: searchQuery && (
                <IconButton size="small" onClick={clearSearch}>
                  <ClearIcon />
                </IconButton>
              ),
            }}
          />
          <Button
            variant="contained"
            startIcon={
              isAdding ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <FaPlus />
              )
            }
            onClick={handleAddUser}
            disabled={isAdding}
          >
            {isAdding ? "Adding..." : "Add User"}
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
          filteredUsers.length
        )}{" "}
        of {filteredUsers.length} entries
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

      {filteredUsers.length === 0 && !loading && (
        <Box sx={{ textAlign: "center", py: 3, color: "text.secondary" }}>
          {searchQuery
            ? "No users found matching your search"
            : "No users found"}
        </Box>
      )}

      {/* Loading overlay for operations */}
      <StyledBackdrop
        open={isAdding || isUpdating !== null || isDeleting !== null}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <CircularProgress color="inherit" />
          <Typography sx={{ mt: 2 }}>
            {isAdding
              ? "Adding user..."
              : isUpdating !== null
              ? "Updating user..."
              : "Deleting user..."}
          </Typography>
        </Box>
      </StyledBackdrop>
    </Box>
  );
}
