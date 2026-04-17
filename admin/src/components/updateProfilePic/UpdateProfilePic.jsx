import React, { useContext, useState, useEffect } from "react";
import axios from "axios";

import { AuthContext } from "../../context/AuthContext";
import "./UpdateProfilePic.css";
const UpdateProfilePic = () => {
  const {
    admin,
    URL,
    setAdmin,
    setShowUpdateProfilePic,
    showUpdateProfilePic,
    profileImage,
    setProfileImage,
  } = useContext(AuthContext);

  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!imageUrl) {
      alert("Choose an image file.");
      return;
    }

    const uid = admin?.id || admin?._id;
    if (!uid) {
      alert("Not logged in.");
      return;
    }

    setLoading(true);
    try {
      // create formate data to send file
      const formData = new FormData();

      formData.append("userId", uid);
      formData.append("image", imageUrl);

      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }

      const res = await axios.put(`${URL}/api/admin/profile-pic`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.status === 200) {
        alert("profile picture updated");
        const next = res.data.admin;
        setAdmin(next);
        setProfileImage(next?.profilePic || null);
        setShowUpdateProfilePic(false);
      }

      console.log("Navbar showUpdateProfilePic:", showUpdateProfilePic);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-pic-container">
      <form className="profile-pic-form" onSubmit={handleSubmit}>
        <input
          type="file"
          placeholder="Enter image URL"
          accept="image/*"
          onChange={(e) => setImageUrl(e.target.files[0])}
        />
        <button className="profile-pic-update-btn" disabled={loading} type="submit">
          {loading ? "Updating..." : "Update Profile pic"}
        </button>
        <button
          className="btn-profile-pic-cancel"
          onClick={() => setShowUpdateProfilePic(false)}
        >
          Cancel
        </button>
      </form>
    </div>
  );
};

export default UpdateProfilePic;
