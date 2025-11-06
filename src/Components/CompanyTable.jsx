import React, { useState, useContext, useEffect, useMemo } from "react";
import styles from "./CompanyTable.module.css";
import { useNavigate } from "react-router-dom";
import { DataContext } from "../Components/Datafetching/DataProvider";
import api from "../Components/Datafetching/api";
import { Download } from "lucide-react";
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
  Chip,
} from "@mui/material";
import { styled } from "@mui/material/styles";

// Styled components for custom styling
const StyledPaper = styled(Paper)(({ theme }) => ({
  // height: 600,
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

// const formatDate = (dateString) => {
//   if (!dateString) return "-";

//   try {
//     // Handle the "Z" suffix properly
//     const formattedDate = dateString.endsWith("Z")
//       ? `${dateString.slice(0, -1)}T00:00:00Z`
//       : dateString;

//     return new Date(formattedDate).toLocaleDateString("en-IN", {
//       day: "2-digit",
//       month: "short",
//       year: "numeric",
//     });
//   } catch (error) {
//     console.error("Error parsing date:", error);
//     return dateString; // Return the original string as a fallback
//   }
// };

export default function CompanyTable({ companyList = [] }) {
  const navigate = useNavigate();
  const { roleid, setadminviewData, incuserid, userid } =
    useContext(DataContext);

  // Filters & Pagination States
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [fieldFilter, setFieldFilter] = useState("all");
  const [fieldOfWorkList, setFieldOfWorkList] = useState([]);

  // Pagination state for Material UI
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });

  // Check if XLSX is available
  const isXLSXAvailable = !!XLSX;

  // Fetch Field of Work List from API
  useEffect(() => {
    const fetchFields = async () => {
      try {
        const response = await api.post(
          "/generic/getcombyfield",
          { userId: 1, userIncId: incuserid },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (response.data?.statusCode === 200) {
          setFieldOfWorkList(response.data.data || []);
        }
      } catch (error) {
        console.error("Error fetching field of work list:", error);
      }
    };

    fetchFields();
  }, [incuserid]);

  // Deduplicate companies by recid
  const uniqueCompanies = useMemo(() => {
    return Array.from(
      new Map(
        (companyList || []).map((item) => [item.incubateesrecid, item])
      ).values()
    );
  }, [companyList]);

  // Filter data using useMemo for performance
  const filteredData = useMemo(() => {
    return uniqueCompanies.filter((item) => {
      const matchesSearch =
        (item.incubateesname || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (item.incubateesfieldofworkname || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesStage =
        stageFilter === "all" ||
        (item.incubateesstagelevel &&
          item.incubateesstagelevel === Number(stageFilter));

      const matchesField =
        fieldFilter === "all" ||
        (item.incubateesfieldofworkname &&
          item.incubateesfieldofworkname.toLowerCase() ===
            fieldFilter.toLowerCase());

      return matchesSearch && matchesStage && matchesField;
    });
  }, [uniqueCompanies, searchTerm, stageFilter, fieldFilter]);

  // Define columns for DataGrid with proper null checks
  const columns = [
    {
      field: "incubateesname",
      headerName: "Company",
      width: 200,
      sortable: true,
    },
    {
      field: "incubateesfieldofworkname",
      headerName: "Field of Work",
      width: 180,
      sortable: true,
    },
    {
      field: "incubateesstagelevel",
      headerName: "Stage",
      width: 150,
      sortable: true,
      renderCell: (params) => {
        if (!params || !params.row)
          return <StyledChip label="—" size="small" />;
        return (
          <StyledChip
            label={params.row.incubateesstagelevelname || "—"}
            size="small"
            stage={params.value}
          />
        );
      },
    },
    {
      field: "incubationshortname",
      headerName: "Incubator",
      width: 150,
      sortable: true,
    },
    {
      field: "incubateesdateofincorporation",
      headerName: "Date of Incorporation",
      width: 180,
      sortable: true,
      renderCell: (params) => {
        if (!params || !params.row) return "-";
        return formatDate(params.row.incubateesdateofincorporation);
      },
    },
    {
      field: "incubateesdateofincubation",
      headerName: "Date of Incubation",
      width: 180,
      sortable: true,
      renderCell: (params) => {
        if (!params || !params.row) return "-";
        return formatDate(params.row.incubateesdateofincubation);
      },
    },
    ...(Number(roleid) === 1 || Number(roleid) === 3 || Number(roleid) === 7
      ? [
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
                  onClick={() => {
                    setadminviewData(params.row.usersrecid);
                    navigate("/startup/Dashboard", {
                      state: {
                        usersrecid: params.row.usersrecid,
                        companyName: params.row.incubateesname,
                      },
                    });
                  }}
                >
                  View Details
                </Button>
              );
            },
          },
        ]
      : []),
  ];

  // Add unique ID to each row if not present
  const rowsWithId = useMemo(() => {
    return filteredData.map((item) => ({
      ...item,
      id: item.incubateesrecid || Math.random().toString(36).substr(2, 9), // Fallback ID
    }));
  }, [filteredData]);

  // Export to CSV function
  const exportToCSV = () => {
    // Create a copy of the data for export
    const exportData = filteredData.map((item) => ({
      "Company Name": item.incubateesname || "",
      "Field of Work": item.incubateesfieldofworkname || "",
      Stage: item.incubateesstagelevelname || "",
      "Date of Incorporation": formatDate(item.incubateesdateofincorporation),
      "Date of Incubation": formatDate(item.incubateesdateofincubation),
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
      `incubatees_${new Date().toISOString().slice(0, 10)}.csv`
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
        "Field of Work": item.incubateesfieldofworkname || "",
        Stage: item.incubateesstagelevelname || "",
        "Date of Incorporation": formatDate(item.incubateesdateofincorporation),
        "Date of Incubation": formatDate(item.incubateesdateofincubation),
      }));

      // Create a workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(wb, ws, "Incubatees");

      // Generate the Excel file and download
      XLSX.writeFile(
        wb,
        `incubatees_${new Date().toISOString().slice(0, 10)}.xlsx`
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
        <Typography variant="h5">Incubatees</Typography>
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
          label="Search companies or fields..."
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

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="field-filter-label">Field of Work</InputLabel>
          <Select
            labelId="field-filter-label"
            value={fieldFilter}
            onChange={(e) => setFieldFilter(e.target.value)}
            label="Field of Work"
          >
            <MenuItem value="all">All Fields</MenuItem>
            {fieldOfWorkList.map((field, index) => (
              <MenuItem key={index} value={field.fieldofworkname}>
                {field.fieldofworkname} ({field.incubatees_count})
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
        of {filteredData.length} entries
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

      {filteredData.length === 0 && (
        <Box sx={{ textAlign: "center", py: 3, color: "text.secondary" }}>
          No companies found matching your criteria.
        </Box>
      )}
    </div>
  );
}
