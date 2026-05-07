import React, { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import UpdateProfilePic from "../../components/updateProfilePic/UpdateProfilePic";
import defaultProfilePic from "../../assets/icons/profileTabletab.png";
import { useNavigate } from "react-router-dom";
import "./Profile.css";

const Profile = () => {
  const { admin, profileImage, showUpdateProfilePic, setShowUpdateProfilePic, setAdmin } =
    useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    setAdmin(null);
    setShowUpdateProfilePic(false);
    navigate("/login");
  };

  const profileRows = [
    { label: "Username", value: admin?.username },
    { label: "Email", value: admin?.email },
    { label: "Role", value: admin?.role },
    { label: "User ID", value: admin?.id || admin?._id },
    { label: "Phone", value: admin?.phone },
  ];

  return (
    <section className="admin-profile">
      {showUpdateProfilePic ? <UpdateProfilePic /> : null}

      <div className="admin-profile__card">
        <div className="admin-profile__header">
          <img
            className="admin-profile__avatar"
            src={profileImage || defaultProfilePic}
            alt="Profile avatar"
          />
          <div className="admin-profile__intro">
            <h1>{admin?.username || "Admin Profile"}</h1>
            <p>View all profile information in one place.</p>
          </div>
        </div>

        <div className="admin-profile__grid">
          {profileRows.map((item) => (
            <div className="admin-profile__row" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value || "-"}</strong>
            </div>
          ))}
        </div>

        <div className="admin-profile__actions">
          <button
            type="button"
            className="admin-profile__btn"
            onClick={() => setShowUpdateProfilePic(true)}
          >
            Update Profile Picture
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
    </section>
  );
};

export default Profile;
