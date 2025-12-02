import React, { useState, useMemo } from "react";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import { FaFilter, FaTimes } from "react-icons/fa";

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
  Tooltip,
  IconButton,
  Popover,
  Card,
  CardContent,
  CardActions,
} from "@mui/material";
import { styled } from "@mui/material/styles";

// Styled components
const StyledPaper = styled(Paper)(({ theme }) => ({
  width: "100%",
  marginBottom: theme.spacing(2),
}));

const StyledChip = styled(Chip)(({ theme, customcolor }) => ({
  backgroundColor: customcolor?.backgroundColor || "#f3f4f6",
  color: customcolor?.color || "#374151",
  fontWeight: 500,
  borderRadius: 4,
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

/**
 * ReusableDataGrid - A flexible, feature-rich data grid component
 *
 * @param {Object} props
 * @param {Array} props.data - The data array to display
 * @param {Array} props.columns - Column configuration (see below for structure)
 * @param {String} props.title - Table title
 * @param {Array} props.dropdownFilters - Optional dropdown filter configuration
 * @param {Boolean} props.enableExport - Enable CSV/Excel export (default: true)
 * @param {Boolean} props.enableColumnFilters - Enable per-column filters (default: true)
 * @param {String} props.searchPlaceholder - Search field placeholder
 * @param {Array} props.searchFields - Fields to search across
 * @param {String} props.uniqueIdField - Field to use as unique row ID
 * @param {Function} props.onExportData - Custom export data transformer
 * @param {Object} props.exportConfig - Export configuration
 *
 * Column Structure:
 * {
 *   field: string,              // Field name in data
 *   headerName: string,         // Display name
 *   width: number,              // Column width
 *   sortable: boolean,          // Enable sorting (default: true)
 *   filterable: boolean,        // Enable column filter (default: true)
 *   type: 'text'|'date'|'chip'|'actions', // Column type
 *   renderCell: function,       // Custom cell renderer
 *   chipColors: object,         // Color mapping for chip type
 *   actions: array              // Action buttons for actions type
 * }
 *
 * Dropdown Filter Structure:
 * {
 *   field: string,              // Field to filter on
 *   label: string,              // Filter label
 *   options: array,             // Filter options [{value, label, count?}]
 *   width: number               // Filter width (default: 200)
 * }
 */
export default function ReusableDataGrid({
  data = [],
  columns = [],
  title = "Data Table",
  dropdownFilters = [],
  enableExport = true,
  enableColumnFilters = true,
  searchPlaceholder = "Search...",
  searchFields = [],
  uniqueIdField = "id",
  onExportData = null,
  exportConfig = {},
  className = "",
}) {
  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownFilterValues, setDropdownFilterValues] = useState(
    dropdownFilters.reduce(
      (acc, filter) => ({ ...acc, [filter.field]: "all" }),
      {}
    )
  );
  const [columnFilters, setColumnFilters] = useState({});
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [filterColumn, setFilterColumn] = useState(null);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });

  // Deduplicate data by unique ID (only if unique IDs exist)
  const uniqueData = useMemo(() => {
    // Check if all items have valid unique IDs
    const hasValidIds = data.every((item) => item[uniqueIdField]);

    if (!hasValidIds) {
      // If no valid IDs, don't deduplicate - return original data
      return data;
    }

    // Only deduplicate if we have valid unique IDs
    return Array.from(
      new Map(data.map((item) => [item[uniqueIdField], item])).values()
    );
  }, [data, uniqueIdField]);

  // Filter data
  const filteredData = useMemo(() => {
    return uniqueData.filter((item) => {
      // General search filter
      const matchesSearch =
        searchTerm === "" ||
        searchFields.some((field) =>
          (item[field] || "").toLowerCase().includes(searchTerm.toLowerCase())
        );

      // Dropdown filters
      const matchesDropdowns = dropdownFilters.every((filter) => {
        const filterValue = dropdownFilterValues[filter.field];
        if (filterValue === "all") return true;

        const itemValue = item[filter.field];
        if (!itemValue) return false;

        // Handle both string and number comparisons
        return (
          itemValue.toString().toLowerCase() ===
          filterValue.toString().toLowerCase()
        );
      });

      // Column-specific filters
      const matchesColumnFilters = Object.entries(columnFilters).every(
        ([field, value]) => {
          if (!value) return true;
          return (item[field] || "")
            .toString()
            .toLowerCase()
            .includes(value.toLowerCase());
        }
      );

      return matchesSearch && matchesDropdowns && matchesColumnFilters;
    });
  }, [
    uniqueData,
    searchTerm,
    dropdownFilterValues,
    columnFilters,
    searchFields,
    dropdownFilters,
  ]);

  // Build DataGrid columns
  const dataGridColumns = useMemo(() => {
    return columns.map((col) => {
      const baseColumn = {
        field: col.field,
        headerName: col.headerName,
        width: col.width || 150,
        sortable: col.sortable !== false,
      };

      // Add filter icon to header if filterable
      if (
        enableColumnFilters &&
        col.filterable !== false &&
        col.type !== "actions"
      ) {
        baseColumn.renderHeader = () => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography>{col.headerName}</Typography>
            <Tooltip title="Filter">
              <IconButton
                size="small"
                onClick={(e) => handleFilterClick(e, col.field)}
                color={columnFilters[col.field] ? "primary" : "default"}
              >
                <FaFilter size={14} />
              </IconButton>
            </Tooltip>
          </Box>
        );
      }

      // Handle different column types
      if (col.type === "date") {
        baseColumn.renderCell = (params) => {
          if (!params?.row) return "-";
          return formatDate(params.row[col.field]);
        };
      } else if (col.type === "chip") {
        baseColumn.renderCell = (params) => {
          if (!params?.row) return <StyledChip label="—" size="small" />;
          const value = params.row[col.field];
          const displayValue = col.displayField
            ? params.row[col.displayField]
            : value;
          const customColor = col.chipColors ? col.chipColors[value] : null;
          return (
            <StyledChip
              label={displayValue || "—"}
              size="small"
              customcolor={customColor}
            />
          );
        };
      } else if (col.type === "actions") {
        baseColumn.sortable = false;
        baseColumn.renderCell = (params) => {
          if (!params?.row) return null;
          return (
            <Box sx={{ display: "flex", gap: 1 }}>
              {col.actions.map((action, idx) => (
                <Button
                  key={idx}
                  variant={action.variant || "contained"}
                  size={action.size || "small"}
                  color={action.color || "primary"}
                  startIcon={action.icon}
                  onClick={() => action.onClick(params.row)}
                  disabled={
                    action.disabled ? action.disabled(params.row) : false
                  }
                >
                  {action.label}
                </Button>
              ))}
            </Box>
          );
        };
      } else if (col.renderCell) {
        baseColumn.renderCell = col.renderCell;
      }

      return baseColumn;
    });
  }, [columns, columnFilters, enableColumnFilters]);

  // Add unique ID to rows
  const rowsWithId = useMemo(() => {
    return filteredData.map((item, index) => ({
      ...item,
      id: item[uniqueIdField] || item.id || `row-${index}-${Date.now()}`,
    }));
  }, [filteredData, uniqueIdField]);

  // Filter handlers
  const handleFilterClick = (event, column) => {
    setFilterAnchorEl(event.currentTarget);
    setFilterColumn(column);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
    setFilterColumn(null);
  };

  const handleFilterChange = (column, value) => {
    setColumnFilters((prev) => ({ ...prev, [column]: value }));
    setPaginationModel({ ...paginationModel, page: 0 });
  };

  const clearFilter = () => {
    setColumnFilters((prev) => ({ ...prev, [filterColumn]: "" }));
  };

  const clearAllFilters = () => {
    setColumnFilters({});
    setSearchTerm("");
    setDropdownFilterValues(
      dropdownFilters.reduce(
        (acc, filter) => ({ ...acc, [filter.field]: "all" }),
        {}
      )
    );
    setPaginationModel({ ...paginationModel, page: 0 });
  };

  const hasActiveFilters =
    Object.values(columnFilters).some((value) => value !== "") ||
    Object.values(dropdownFilterValues).some((value) => value !== "all") ||
    searchTerm !== "";

  // Export functions
  const getExportData = () => {
    if (onExportData) {
      return onExportData(filteredData);
    }

    // Default export: all non-action columns
    return filteredData.map((item) => {
      const row = {};
      columns
        .filter((col) => col.type !== "actions")
        .forEach((col) => {
          const header = col.exportHeader || col.headerName;
          let value = item[col.field];

          if (col.type === "date") {
            value = formatDate(value);
          } else if (col.type === "chip" && col.displayField) {
            value = item[col.displayField];
          }

          row[header] = value || "";
        });
      return row;
    });
  };

  const exportToCSV = () => {
    const exportData = getExportData();
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
      `${exportConfig.filename || "data"}_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = () => {
    if (!XLSX) {
      alert("Excel export is not available.");
      return;
    }

    try {
      const exportData = getExportData();
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, exportConfig.sheetName || "Data");
      XLSX.writeFile(
        wb,
        `${exportConfig.filename || "data"}_${new Date()
          .toISOString()
          .slice(0, 10)}.xlsx`
      );
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      exportToCSV();
    }
  };

  return (
    <div className={className}>
      <div style={{ marginBottom: "16px" }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h5">{title}</Typography>
          {enableExport && (
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<Download size={16} />}
                onClick={exportToCSV}
              >
                Export CSV
              </Button>
              <Button
                variant="outlined"
                startIcon={<Download size={16} />}
                onClick={exportToExcel}
                disabled={!XLSX}
              >
                Export Excel
              </Button>
            </Box>
          )}
        </Box>

        {/* Filters Section */}
        <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
          {searchFields.length > 0 && (
            <TextField
              label={searchPlaceholder}
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ minWidth: 250 }}
            />
          )}

          {dropdownFilters.map((filter, idx) => (
            <FormControl
              key={idx}
              size="small"
              sx={{ minWidth: filter.width || 200 }}
            >
              <InputLabel id={`${filter.field}-label`}>
                {filter.label}
              </InputLabel>
              <Select
                labelId={`${filter.field}-label`}
                value={dropdownFilterValues[filter.field]}
                onChange={(e) =>
                  setDropdownFilterValues((prev) => ({
                    ...prev,
                    [filter.field]: e.target.value,
                  }))
                }
                label={filter.label}
              >
                <MenuItem value="all">All {filter.label}</MenuItem>
                {filter.options.map((option, optIdx) => (
                  <MenuItem key={optIdx} value={option.value}>
                    {option.label}
                    {option.count !== undefined && ` (${option.count})`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ))}

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

          {hasActiveFilters && (
            <Button
              variant="outlined"
              startIcon={<FaTimes />}
              onClick={clearAllFilters}
              sx={{ height: "fit-content" }}
            >
              Clear All Filters
            </Button>
          )}
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

        {/* DataGrid */}
        <StyledPaper>
          <DataGrid
            rows={rowsWithId}
            columns={dataGridColumns}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[5, 10, 25, 50]}
            disableRowSelectionOnClick
            sx={{ border: 0 }}
            autoHeight
            disableColumnMenu
          />
        </StyledPaper>

        {filteredData.length === 0 && (
          <Box sx={{ textAlign: "center", py: 3, color: "text.secondary" }}>
            No data found matching your criteria.
          </Box>
        )}

        {/* Filter Popover */}
        {/* Filter Popover */}
        <Popover
          open={Boolean(filterAnchorEl)}
          anchorEl={filterAnchorEl}
          onClose={handleFilterClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
        >
          <Card sx={{ minWidth: 280, maxWidth: 400 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Filter by{" "}
                {columns.find((c) => c.field === filterColumn)?.headerName}
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder={`Enter ${
                  columns.find((c) => c.field === filterColumn)?.headerName
                }...`}
                value={columnFilters[filterColumn] || ""}
                onChange={(e) =>
                  handleFilterChange(filterColumn, e.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleFilterClose();
                  }
                }}
                variant="outlined"
                margin="normal"
              />
            </CardContent>
            <CardActions sx={{ justifyContent: "flex-end" }}>
              <Button size="small" onClick={clearFilter}>
                Clear
              </Button>
              <Button size="small" onClick={handleFilterClose}>
                Close
              </Button>
            </CardActions>
          </Card>
        </Popover>
      </div>
    </div>
  );
}
