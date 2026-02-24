import React, { useContext, useState,useEffect } from "react";
import axios from "axios";

import { AuthContext } from "../../context/AuthContext";
import  './UpdateProfilePic.css';
const UpdateProfilePic = () => {
  const { admin, URL, setAdmin } = useContext(AuthContext);

  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!imageUrl) return alert("Enter your image");
    console.log(admin ? admin.id : null);
    try {
      // create formate data to send file
      const formData = new FormData();

      formData.append("userId", admin.id);
      formData.append("image", imageUrl);

      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }

      const res = await axios.put(`${URL}/api/admin/profile-pic`, formData, {
        headers: { "Content-Type": "multipart/form-Data" },
      });

      if (res.status === 200) {
        alert("profile picture updated");
        setAdmin(res.data.admin);
      }
    } catch (error) {
      console.error(error);
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
        <button type="submit">Update Profile pic</button>
      </form>
    </div>
  );
};

export default UpdateProfilePic;
