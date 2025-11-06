// src/components/ChatHistory.jsx
import React, { useState, useEffect } from "react";
import styles from "../Navbar.module.css";
import {
  Search,
  Calendar,
  User,
  ArrowLeft,
  FileText,
  Download,
} from "lucide-react";
import { getChatHistory } from "./chatService";
import "./ChatHistory.css";
import { useNavigate } from "react-router-dom";
import ITELLogo from "../../assets/ITEL_Logo.png";
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
  InputAdornment,
  Modal,
  CircularProgress,
  Chip,
  IconButton,
  Avatar,
  Divider,
  Card,
  CardContent,
  CardHeader,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Menu,
  Tooltip,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import MoreVertIcon from "@mui/icons-material/MoreVert";

// Styled components for custom styling
const StyledPaper = styled(Paper)(({ theme }) => ({
  width: "100%",
  marginBottom: theme.spacing(2),
  height: "calc(100vh - 300px)", // Fixed height for scrollable table
}));

const MessageCard = styled(Card)(({ theme, $isSent }) => ({
  marginBottom: theme.spacing(1),
  backgroundColor: $isSent
    ? theme.palette.primary.light
    : theme.palette.background.paper,
  alignSelf: $isSent ? "flex-end" : "flex-start",
  maxWidth: "70%",
}));

const AttachmentChip = styled(Chip)(({ theme }) => ({
  marginTop: theme.spacing(1),
  backgroundColor: theme.palette.grey[200],
}));

// Styled component for attachment container
const AttachmentContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  padding: theme.spacing(0.5, 1),
  borderRadius: theme.spacing(0.5),
  backgroundColor: theme.palette.action.hover,
  transition: "background-color 0.2s",
  "&:hover": {
    backgroundColor: theme.palette.action.selected,
  },
}));

const ChatHistory = ({ currentUser: propCurrentUser }) => {
  // Get currentUser from prop or sessionStorage
  const [currentUser, setCurrentUser] = useState(
    propCurrentUser ||
      JSON.parse(sessionStorage.getItem("currentUser")) || {
        id: sessionStorage.getItem("userid") || "1",
        name: sessionStorage.getItem("username") || "User",
        role: sessionStorage.getItem("userrole") || "incubatee",
        roleid: sessionStorage.getItem("roleid") || null,
        incUserid: sessionStorage.getItem("incUserid") || null,
      }
  );

  const [chatHistory, setChatHistory] = useState([]);
  const [chatDetails, setChatDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [downloadingFiles, setDownloadingFiles] = useState(new Set());
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });
  const [anchorEl, setAnchorEl] = useState(null);
  const [columnAlignment, setColumnAlignment] = useState({
    chatlistsubject: "left",
    chatdetailsfromusername: "left",
    chatdetailstousername: "left",
    chatdetailsmessage: "left",
    chatdetailscreatedtime: "center",
    chatlistchatstate: "center",
    chatdetailsattachmentpath: "left",
  });
  const [sortModel, setSortModel] = useState([
    {
      field: "chatdetailscreatedtime",
      sort: "desc",
    },
  ]);
  const navigate = useNavigate();

  // Check if XLSX is available
  const isXLSXAvailable = !!XLSX;

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        // Use the new API to get all chat details for the current user
        const data = await getChatHistory(
          currentUser.id,
          currentUser.incUserid
        );
        setChatHistory(data);
      } catch (error) {
        console.error("Error fetching chat history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [currentUser.id]);

  // Filter messages based on search term
  const filteredMessages = chatHistory.filter((message) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (message.chatlistsubject &&
        message.chatlistsubject.toLowerCase().includes(searchLower)) ||
      (message.chatdetailsfromusername &&
        message.chatdetailsfromusername.toLowerCase().includes(searchLower)) ||
      (message.chatdetailstousername &&
        message.chatdetailstousername.toLowerCase().includes(searchLower)) ||
      (message.chatdetailsmessage &&
        message.chatdetailsmessage.toLowerCase().includes(searchLower)) ||
      message.chatdetailslistid.toString().includes(searchLower)
    );
  });

  // Helper function to generate a filename with datetime
  const generateFilenameWithDateTime = (originalFileName) => {
    const now = new Date();
    const dateTimeString = now
      .toISOString()
      .replace(/:/g, "-")
      .replace(/\..+/, "");

    // Extract file extension if present
    const lastDotIndex = originalFileName.lastIndexOf(".");
    const nameWithoutExtension =
      lastDotIndex > 0
        ? originalFileName.substring(0, lastDotIndex)
        : originalFileName;
    const fileExtension =
      lastDotIndex > 0 ? originalFileName.substring(lastDotIndex) : "";

    return `${nameWithoutExtension}_${dateTimeString}${fileExtension}`;
  };

  // Function to get file URL from API
  const getFileUrl = async (path) => {
    try {
      const response = await fetch(
        `${IPAdress}/itelinc/resources/generic/getfileurl`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            userid: currentUser.id,
            incUserId: currentUser.incUserid,
            url: path,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get file URL");
      }

      const data = await response.json();
      return data.data; // Return the URL from the response
    } catch (error) {
      console.error("Error getting file URL:", error);
      throw error;
    }
  };

  // Function to download attachment
  const downloadAttachment = async (message) => {
    if (!message.chatdetailsattachmentpath || !message.chatdetailsfilename)
      return;

    // Add this message ID to the downloading set
    setDownloadingFiles((prev) => new Set(prev).add(message.chatdetailsrecid));

    try {
      // Use the filename from the API response with datetime
      const downloadFileName = generateFilenameWithDateTime(
        message.chatdetailsfilename
      );

      // Check if the attachment is a URL path (not base64)
      const isUrlPath =
        message.chatdetailsattachmentpath &&
        !message.chatdetailsattachmentpath.startsWith("http") &&
        !message.chatdetailsattachmentpath.startsWith("data:") &&
        message.chatdetailsattachmentpath.includes("/");

      // Check if the attachment is a base64 string
      const isBase64 =
        message.chatdetailsattachmentpath &&
        !message.chatdetailsattachmentpath.startsWith("http") &&
        !message.chatdetailsattachmentpath.startsWith("data:") &&
        !isUrlPath &&
        message.chatdetailsattachmentpath.length > 100;

      if (isUrlPath) {
        // Get the file URL from API
        const fileUrl = await getFileUrl(message.chatdetailsattachmentpath);

        // Fetch the file content
        const response = await fetch(fileUrl, {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch file");
        }

        // Get the blob from the response
        const blob = await response.blob();

        // Create a URL for the blob
        const blobUrl = URL.createObjectURL(blob);

        // Create a link and trigger download
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = downloadFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the blob URL
        URL.revokeObjectURL(blobUrl);
      } else if (isBase64) {
        // Handle base64 data
        const byteCharacters = atob(message.chatdetailsattachmentpath);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);

        // Determine MIME type based on file extension
        let mimeType = "application/octet-stream";
        const fileExtension = message.chatdetailsfilename
          .substring(message.chatdetailsfilename.lastIndexOf("."))
          .toLowerCase();

        if (fileExtension === ".png") {
          mimeType = "image/png";
        } else if (fileExtension === ".jpg" || fileExtension === ".jpeg") {
          mimeType = "image/jpeg";
        } else if (fileExtension === ".gif") {
          mimeType = "image/gif";
        } else if (fileExtension === ".pdf") {
          mimeType = "application/pdf";
        } else if (fileExtension === ".zip") {
          mimeType = "application/zip";
        }

        const blob = new Blob([byteArray], { type: mimeType });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = downloadFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // For direct URLs, we also need to fetch the content first
        try {
          // Fetch the file content
          const response = await fetch(message.chatdetailsattachmentpath, {
            headers: {
              Authorization: `Bearer ${sessionStorage.getItem("token")}`,
            },
          });

          if (!response.ok) {
            throw new Error("Failed to fetch file");
          }

          // Get the blob from the response
          const blob = await response.blob();

          // Create a URL for the blob
          const blobUrl = URL.createObjectURL(blob);

          // Create a link and trigger download
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = downloadFileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // Clean up the blob URL
          URL.revokeObjectURL(blobUrl);
        } catch (fetchError) {
          // If fetching fails, fall back to the original method
          console.warn(
            "Could not fetch file content, falling back to direct download:",
            fetchError
          );
          const link = document.createElement("a");
          link.href = message.chatdetailsattachmentpath;
          link.download = downloadFileName;
          link.target = "_blank";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    } catch (error) {
      console.error("Error downloading attachment:", error);
      // You could show an error message to the user here
    } finally {
      // Remove this message ID from the downloading set
      setDownloadingFiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(message.chatdetailsrecid);
        return newSet;
      });
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const handleBackToPortal = () => {
    const roleId = Number(currentUser.roleid);
    const id = Number(currentUser.id);

    if (roleId === 1) {
      navigate("/Incubation/Dashboard/Chats");
    }
  };

  // Group messages by chat ID for the modal view
  const getChatMessages = (chatId) => {
    return chatHistory
      .filter((msg) => msg.chatdetailslistid === chatId)
      .sort(
        (a, b) =>
          new Date(a.chatdetailscreatedtime) -
          new Date(b.chatdetailscreatedtime)
      );
  };

  // Add unique ID to each row if not present
  const rowsWithId = React.useMemo(() => {
    return filteredMessages.map((item) => ({
      ...item,
      id: item.chatdetailsrecid || Math.random().toString(36).substr(2, 9),
    }));
  }, [filteredMessages]);

  // Export to CSV function
  const exportToCSV = () => {
    // Create a copy of the data for export
    const exportData = filteredMessages.map((item) => ({
      "Chat Subject":
        item.chatlistsubject || `Chat ID: ${item.chatdetailslistid}`,
      From: item.chatdetailsfromusername || "",
      To: item.chatdetailstousername || "",
      Message: item.chatdetailsmessage || "",
      "Date & Time": formatDate(item.chatdetailscreatedtime),
      Status: item.chatlistchatstate || "",
      Attachment: item.chatdetailsfilename || "None",
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
      `chat_history_${new Date().toISOString().slice(0, 10)}.csv`
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
      const exportData = filteredMessages.map((item) => ({
        "Chat Subject":
          item.chatlistsubject || `Chat ID: ${item.chatdetailslistid}`,
        From: item.chatdetailsfromusername || "",
        To: item.chatdetailstousername || "",
        Message: item.chatdetailsmessage || "",
        "Date & Time": formatDate(item.chatdetailscreatedtime),
        Status: item.chatlistchatstate || "",
        Attachment: item.chatdetailsfilename || "None",
      }));

      // Create a workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(wb, ws, "Chat History");

      // Generate the Excel file and download
      XLSX.writeFile(
        wb,
        `chat_history_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Error exporting to Excel. Falling back to CSV export.");
      exportToCSV();
    }
  };

  // Handle column alignment change
  const handleAlignmentChange = (column, alignment) => {
    setColumnAlignment((prev) => ({
      ...prev,
      [column]: alignment,
    }));
    setAnchorEl(null);
  };

  // Get alignment styles
  const getAlignmentStyles = (column) => {
    const alignment = columnAlignment[column] || "left";
    const verticalAlign = "middle"; // Default vertical alignment

    return {
      display: "flex",
      alignItems: verticalAlign,
      justifyContent:
        alignment === "left"
          ? "flex-start"
          : alignment === "right"
          ? "flex-end"
          : "center",
      textAlign: alignment,
      px: 1,
    };
  };

  // Define columns for DataGrid with sorting enabled
  const columns = [
    {
      field: "chatlistsubject",
      headerName: "Chat Subject",
      width: 200,
      sortable: true,
      renderCell: (params) => (
        <Box sx={getAlignmentStyles("chatlistsubject")}>
          <Typography variant="body2">
            {params.value || `Chat ID: ${params.row.chatdetailslistid}`}
          </Typography>
        </Box>
      ),
    },
    {
      field: "chatdetailsfromusername",
      headerName: "From",
      width: 150,
      sortable: true,
      renderCell: (params) => (
        <Box sx={getAlignmentStyles("chatdetailsfromusername")}>
          <Typography variant="body2">{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: "chatdetailstousername",
      headerName: "To",
      width: 150,
      sortable: true,
      renderCell: (params) => (
        <Box sx={getAlignmentStyles("chatdetailstousername")}>
          <Typography variant="body2">{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: "chatdetailsmessage",
      headerName: "Message",
      width: 250,
      sortable: true,
      renderCell: (params) => (
        <Box sx={getAlignmentStyles("chatdetailsmessage")}>
          <Typography variant="body2" noWrap>
            {params.value.substring(0, 100)}
            {params.value.length > 100 ? "..." : ""}
          </Typography>
        </Box>
      ),
    },
    {
      field: "chatdetailscreatedtime",
      headerName: "Date & Time",
      width: 180,
      sortable: true,
      valueGetter: (params) => {
        // Convert string to Date object for proper sorting
        return params.value ? new Date(params.value) : null;
      },
      renderCell: (params) => (
        <Box sx={getAlignmentStyles("chatdetailscreatedtime")}>
          <Typography variant="body2">{formatDate(params.value)}</Typography>
        </Box>
      ),
    },
    {
      field: "chatlistchatstate",
      headerName: "Status",
      width: 120,
      sortable: true,
      renderCell: (params) => (
        <Box sx={getAlignmentStyles("chatlistchatstate")}>
          <Chip
            label={params.value}
            size="small"
            color={
              params.value === "Active"
                ? "primary"
                : params.value === "Closed"
                ? "default"
                : "secondary"
            }
          />
        </Box>
      ),
    },
    {
      field: "chatdetailsattachmentpath",
      headerName: "Attachment",
      width: 250,
      sortable: true,
      renderCell: (params) => {
        if (!params.value) {
          return (
            <Box sx={getAlignmentStyles("chatdetailsattachmentpath")}>
              <Typography variant="body2" color="text.secondary">
                No attachment
              </Typography>
            </Box>
          );
        }

        return (
          <AttachmentContainer
            sx={getAlignmentStyles("chatdetailsattachmentpath")}
          >
            <FileText size={16} color="#666" />
            <Typography
              variant="body2"
              sx={{
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: "0.875rem",
              }}
              title={params.row.chatdetailsfilename || "File"}
            >
              {params.row.chatdetailsfilename || "File"}
            </Typography>
            <Tooltip title="Download attachment">
              <IconButton
                size="small"
                onClick={() => downloadAttachment(params.row)}
                disabled={downloadingFiles.has(params.row.chatdetailsrecid)}
                sx={{
                  padding: "4px",
                  ml: 0.5,
                  "&:hover": {
                    backgroundColor: "rgba(0, 0, 0, 0.04)",
                  },
                }}
              >
                {downloadingFiles.has(params.row.chatdetailsrecid) ? (
                  <CircularProgress size={16} />
                ) : (
                  <Download size={16} color="black" />
                )}
              </IconButton>
            </Tooltip>
          </AttachmentContainer>
        );
      },
    },
  ];

  return (
    <Box
      className="chat-history-page"
      sx={{ height: "100vh", display: "flex", flexDirection: "column" }}
    >
      <header className={styles.header}>
        <div className={styles.container}>
          <div className={styles.logoSection}>
            <img src={ITELLogo} className={styles.logoIcon} alt="ITEL Logo" />
            <div>
              <h1 className={styles.title}>ITEL Incubation Portal</h1>
              <p className={styles.subtitle}>Chat History</p>
            </div>
          </div>
          <div className={styles.actions}>
            <Button
              variant="contained"
              startIcon={<ArrowLeft />}
              onClick={handleBackToPortal}
            >
              Back To Chats
            </Button>
          </div>
        </div>
      </header>

      <main className="chat-history-main" sx={{ flexGrow: 1, p: 3 }}>
        <Box className="chat-history-container" sx={{ p: 2 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h4">Chat History</Typography>
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
              <IconButton
                onClick={(e) => setAnchorEl(e.currentTarget)}
                title="Column Alignment"
              >
                <MoreVertIcon />
              </IconButton>
            </Box>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem disabled>Column Alignment</MenuItem>
            {Object.keys(columnAlignment).map((column) => (
              <MenuItem key={column}>
                <Typography variant="body2" sx={{ mr: 2 }}>
                  {column === "chatlistsubject" && "Subject"}
                  {column === "chatdetailsfromusername" && "From"}
                  {column === "chatdetailstousername" && "To"}
                  {column === "chatdetailsmessage" && "Message"}
                  {column === "chatdetailscreatedtime" && "Date"}
                  {column === "chatlistchatstate" && "Status"}
                  {column === "chatdetailsattachmentpath" && "Attachment"}
                </Typography>
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <Select
                    value={columnAlignment[column]}
                    onChange={(e) =>
                      handleAlignmentChange(column, e.target.value)
                    }
                  >
                    <MenuItem value="left">Left</MenuItem>
                    <MenuItem value="center">Center</MenuItem>
                    <MenuItem value="right">Right</MenuItem>
                  </Select>
                </FormControl>
              </MenuItem>
            ))}
          </Menu>

          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Search by subject, from, to, or message content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={20} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <StyledPaper>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                <CircularProgress />
              </Box>
            ) : filteredMessages.length === 0 ? (
              <Box sx={{ textAlign: "center", p: 3 }}>
                <Typography variant="body1">No chat history found</Typography>
              </Box>
            ) : (
              <DataGrid
                rows={rowsWithId}
                columns={columns}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                pageSizeOptions={[5, 10, 25, 50]}
                sortModel={sortModel}
                onSortModelChange={(newSortModel) => setSortModel(newSortModel)}
                disableRowSelectionOnClick
                sx={{
                  border: 0,
                  "& .MuiDataGrid-root": {
                    overflow: "auto",
                  },
                  "& .MuiDataGrid-cell": {
                    whiteSpace: "normal !important",
                    wordWrap: "break-word !important",
                  },
                  "& .MuiDataGrid-columnHeaders": {
                    backgroundColor: "#f5f5f5",
                    fontWeight: "bold",
                  },
                  "& .MuiDataGrid-columnHeader--sortable": {
                    cursor: "pointer",
                    "&:hover": {
                      backgroundColor: "#eeeeee",
                    },
                  },
                }}
              />
            )}
          </StyledPaper>
        </Box>
      </main>

      <Modal
        open={showDetails}
        onClose={() => setShowDetails(false)}
        aria-labelledby="chat-details-modal"
        aria-describedby="modal for chat details"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "80%",
            maxWidth: 800,
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
            maxHeight: "80vh",
            overflow: "auto",
            borderRadius: 2,
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h5" component="h2">
              Chat Details - ID: {selectedChatId}
            </Typography>
            <IconButton onClick={() => setShowDetails(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {loadingDetails[selectedChatId] ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                p: 2,
                maxHeight: "60vh",
                overflow: "auto",
              }}
            >
              {getChatMessages(selectedChatId).map((message) => (
                <MessageCard
                  key={message.chatdetailsrecid}
                  $isSent={message.chatdetailsfrom == currentUser.id}
                >
                  <CardHeader
                    avatar={
                      <Avatar>
                        {message.chatdetailsfrom == currentUser.id ? (
                          <User size={20} />
                        ) : (
                          message.chatdetailsfromusername?.charAt(0) || "U"
                        )}
                      </Avatar>
                    }
                    title={
                      message.chatdetailsfrom == currentUser.id
                        ? "You"
                        : message.chatdetailsfromusername || "Unknown"
                    }
                    subheader={formatDate(message.chatdetailscreatedtime)}
                  />
                  <CardContent>
                    <Typography variant="body1">
                      {message.chatdetailsmessage}
                    </Typography>
                    {message.chatdetailsattachmentpath && (
                      <AttachmentChip
                        icon={<FileText size={16} />}
                        label={message.chatdetailsfilename || "File"}
                        onClick={() => downloadAttachment(message)}
                        onDelete={
                          downloadingFiles.has(message.chatdetailsrecid)
                            ? undefined
                            : () => downloadAttachment(message)
                        }
                        deleteIcon={
                          downloadingFiles.has(message.chatdetailsrecid) ? (
                            <CircularProgress size={16} />
                          ) : (
                            <Download size={16} />
                          )
                        }
                      />
                    )}
                  </CardContent>
                </MessageCard>
              ))}
            </Box>
          )}
        </Box>
      </Modal>
    </Box>
  );
};

export default ChatHistory;
