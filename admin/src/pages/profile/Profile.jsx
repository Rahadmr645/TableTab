import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import UpdateProfilePic from "../../components/updateProfilePic/UpdateProfilePic";
import defaultProfilePic from "../../assets/icons/profileTabletab.png";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Profile.css";

const Profile = () => {
  const { admin, profileImage, showUpdateProfilePic, setShowUpdateProfilePic, setAdmin, URL } =
    useContext(AuthContext);
  const navigate = useNavigate();

  const [staff, setStaff] = useState([]);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setLoadingStaff(true);
        const token = localStorage.getItem("token");
        const res = await axios.get(`${URL}/api/admin/staff`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStaff(res.data.staff || []);
      } catch (error) {
        console.error("Failed to fetch staff", error);
      } finally {
        setLoadingStaff(false);
      }
    };
    if (admin) {
      fetchStaff();
    }
  }, [admin, URL]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setAdmin(null);
    setShowUpdateProfilePic(false);
    navigate("/login");
  };

  const subscriptionDisplay = (() => {
    if (!admin?.subscriptionStatus) return "—";
    
    let text = admin.subscriptionStatus.charAt(0).toUpperCase() + admin.subscriptionStatus.slice(1);
    
    if (admin.expiresAt) {
      const daysLeft = Math.ceil((new Date(admin.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysLeft > 0) {
        text += ` (${daysLeft} days left)`;
      } else if (admin.subscriptionStatus !== 'expired') {
        text += ` (Expires today)`;
      }
    }
    
    return text;
  })();

  const profileRows = [
    { label: "Username", value: admin?.username },
    { label: "Email", value: admin?.email },
    { label: "Role", value: admin?.role },
    { label: "Company name", value: admin?.companyName },
    { label: "Subscription", value: subscriptionDisplay },
    {
      label: "Registered Staff",
      value: loadingStaff ? "Loading..." : `${staff.length} Staff Member${staff.length !== 1 ? 's' : ''}`,
      clickable: true,
      onClick: () => setShowStaffModal(true)
    },
    {
      label: "User ID",
      value: admin?.userId || admin?.id || admin?._id,
    },
    { label: "Phone", value: admin?.phone },
  ];

  const roleLabel =
    typeof admin?.role === "string"
      ? admin.role.charAt(0).toUpperCase() + admin.role.slice(1)
      : "";

  return (
    <section className="admin-profile">
      {showUpdateProfilePic ? <UpdateProfilePic /> : null}

      {showStaffModal && (
        <div className="admin-profile__modal-overlay" onClick={() => setShowStaffModal(false)}>
          <div className="admin-profile__modal-content" onClick={e => e.stopPropagation()}>
            <div className="admin-profile__modal-header">
              <h2>Registered Staff</h2>
              <button className="admin-profile__modal-close" onClick={() => setShowStaffModal(false)}>×</button>
            </div>
            <div className="admin-profile__modal-body">
              {staff.length === 0 ? (
                <p className="admin-profile__modal-empty">No staff members found.</p>
              ) : (
                <div className="admin-profile__staff-list">
                  {staff.map((s) => {
                    return (
                      <div key={s._id} className="admin-profile__staff-card">
                        <img 
                          src={s.profilePic || defaultProfilePic} 
                          alt={s.username} 
                          className="admin-profile__staff-avatar" 
                        />
                        <div className="admin-profile__staff-info">
                          <strong>{s.username}</strong>
                          <span>{s.email}</span>
                          <span className="admin-profile__staff-role">{s.role}</span>
                        </div>
                        <div className="admin-profile__staff-meta">
                          <span className={`admin-profile__staff-status ${s.staffStatus === 'suspended' ? 'suspended' : 'active'}`}>
                            {s.staffStatus}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="admin-profile__card">
        <div className="admin-profile__hero">
          <div className="admin-profile__avatar-wrap">
            <img
              className="admin-profile__avatar"
              src={profileImage || defaultProfilePic}
              alt=""
            />
            <span className="admin-profile__avatar-badge" aria-hidden title="Active" />
          </div>
          <div className="admin-profile__intro">
            <h1>{admin?.username || "Your profile"}</h1>
            <div className="admin-profile__meta">
              {roleLabel ? (
                <span className="admin-profile__pill">{roleLabel}</span>
              ) : null}
              {admin?.companyName ? (
                <p className="admin-profile__company">
                  <span>Company</span>
                  {admin.companyName}
                </p>
              ) : null}
            </div>
            <p className="admin-profile__lead">
              Account details for this venue. Your company and role are set by your restaurant
              administrator.
            </p>
          </div>
        </div>

        <div className="admin-profile__body">
          <p className="admin-profile__section-label">Profile details</p>
          <div className="admin-profile__grid">
            {profileRows.map((item) => (
              <div 
                className={`admin-profile__row ${item.clickable ? "admin-profile__row--clickable" : ""}`} 
                key={item.label}
                onClick={item.clickable ? item.onClick : undefined}
                role={item.clickable ? "button" : undefined}
                tabIndex={item.clickable ? 0 : undefined}
              >
                <span>{item.label}</span>
                <strong>
                  {item.value || "—"}
                  {item.clickable && <span className="admin-profile__click-hint"> (Click to view)</span>}
                </strong>
              </div>
            ))}
          </div>

          <div className="admin-profile__actions">
            <button
              type="button"
              className="admin-profile__btn admin-profile__btn--primary"
              onClick={() => setShowUpdateProfilePic(true)}
            >
              Update profile photo
            </button>
            <button
              type="button"
              className="admin-profile__btn admin-profile__btn--logout"
              onClick={handleLogout}
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Profile;
