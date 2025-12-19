import { useNavigate, useParams } from "react-router-dom";
import { useState, useContext } from "react";
import styles from "./LoginForm.module.css";
import logo from "../../assets/ITEL_Logo.png";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import Swal from "sweetalert2";
import api from "../Datafetching/api"; // axios instance
import { DataContext } from "../Datafetching/DataProvider";
import ForgotPasswordModal from "../StartupDashboard/ForgotPasswordModal";

const LoginForm = () => {
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const { setUserid, setroleid, setincuserid } = useContext(DataContext); // ✅ access setUserid
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  console.log("email", formData.username);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Show loading popup
      Swal.fire({
        title: "Logging in...",
        text: "Please wait while we verify your credentials",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const response = await api.post("/auth/login", {
        username: formData.username,
        password: formData.password,
      });

      const result = response.data;
      console.log("Login Response:", result);

      const { token, userid, roleid, incuserid, increcid } = result.data;

      // Save session data
      localStorage.clear();

      // For admin (roleid "0"), set userid to "ALL", otherwise use the actual userid
      const useridValue = roleid === "0" ? "ALL" : userid;
      sessionStorage.setItem("userid", userid);
      sessionStorage.setItem("token", token);
      sessionStorage.setItem("roleid", roleid);
      sessionStorage.setItem("email", formData.username);
      sessionStorage.setItem("incubateeId", increcid);

      // For admin (roleid "0"), set incuserid to "ALL", otherwise use the actual incuserid
      const incuseridValue = roleid === "0" ? "ALL" : incuserid;
      sessionStorage.setItem("incuserid", incuseridValue);

      // Update context with the correct values
      setUserid(userid);
      setroleid(roleid);
      setincuserid(incuseridValue);
      setFormData((prev) => ({
        ...prev,
        password: "",
      }));

      // Close loading popup before showing success
      Swal.close();

      // Redirect based on role
      if (roleid === "0") {
        Swal.fire({
          icon: "success",
          title: "Welcome Admin!",
          text: "Redirecting...",
          timer: 2000,
          showConfirmButton: false,
        });
        setTimeout(() => navigate("/Incubation/Dashboard"), 1000);
      } else if (roleid === "1") {
        Swal.fire({
          icon: "success",
          title: "Welcome Incubator!",
          text: "Redirecting...",
          timer: 2000,
          showConfirmButton: false,
        });
        setTimeout(() => navigate("/Incubation/Dashboard"), 1000);
      } else if (roleid === "3") {
        Swal.fire({
          icon: "success",
          title: "Welcome Incubator Operator!",
          text: "Redirecting...",
          timer: 2000,
          showConfirmButton: false,
        });
        setTimeout(() => navigate("/Incubation/Dashboard"), 1000);
      } else if (roleid === "7") {
        Swal.fire({
          icon: "success",
          title: "Welcome Due Diligence Inspector!",
          text: "Redirecting...",
          timer: 2000,
          showConfirmButton: false,
        });
        setTimeout(() => navigate("/Incubation/Dashboard"), 1000);
      } else if (roleid === "4") {
        Swal.fire({
          icon: "success",
          title: "Welcome Incubatee!",
          text: "Redirecting...",
          timer: 2000,
          showConfirmButton: false,
        });
        setTimeout(() => navigate("/startup/Dashboard"), 1000);
      } else {
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: "Unknown role!",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      Swal.close(); // Close loading popup if error occurs
      Swal.fire({
        icon: "error",
        title: "Login Failed",
        text: "Invalid username or password",
      });
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.logoSection}>
          <div className={styles.logoWrapper}>
            <img src={logo} alt="Logo" className={styles.logo} />
          </div>
          <h1 className={styles.heading}>Welcome Back</h1>
          <p className={styles.subText}>Sign in to your account to continue</p>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Sign In</h2>
            <p className={styles.cardDescription}>
              Enter your credentials to access your account
            </p>
          </div>
          <div className={styles.cardContent}>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label htmlFor="username" className={styles.label}>
                  Username
                </label>
                <div className={styles.inputWrapper}>
                  <User className={styles.icon} />
                  <input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={formData.username}
                    onChange={(e) =>
                      handleInputChange("username", e.target.value)
                    }
                    className={styles.input}
                    style={{ textAlign: "center" }}
                    required
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="password" className={styles.label}>
                  Password
                </label>
                <div className={styles.inputWrapper}>
                  <Lock className={styles.icon} />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    className={styles.input}
                    style={{ textAlign: "center" }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={styles.eyeButton}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" className={styles.submitButton}>
                Sign In
              </button>

              <div className={styles.textCenter}>
                <button
                  type="button"
                  className={styles.link}
                  onClick={() => setIsForgotOpen(true)}
                >
                  Forgot your password?
                </button>
              </div>

              <ForgotPasswordModal
                isOpen={isForgotOpen}
                onClose={() => setIsForgotOpen(false)}
              />
            </form>
          </div>
        </div>

        <div className={styles.footer}>
          <div className={styles.versionContainer}>
            <span className={styles.versionLabel}>Version</span>

            <span className={styles.versionNumber}> 0.0.4</span>
          </div>
          <div className={styles.copyright}>
            © {new Date().getFullYear()} ITEL. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
