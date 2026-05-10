import React, { useContext, useState, useEffect, useRef } from "react";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";
import defaultProfilePic from "../../assets/icons/profileTabletab.png";
import "./UpdateProfilePic.css";

const UpdateProfilePic = () => {
  const {
    admin,
    URL,
    setAdmin,
    setShowUpdateProfilePic,
    profileImage,
    setProfileImage,
  } = useContext(AuthContext);

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setShowUpdateProfilePic(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setShowUpdateProfilePic]);

  const onPickFile = (selected) => {
    if (!selected) return;
    setFile(selected);
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert("Choose an image file.");
      return;
    }

    const uid = admin?.userId || admin?.id || admin?._id;
    if (!uid) {
      alert("Not logged in.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("userId", uid);
      formData.append("image", file);

      const token = localStorage.getItem("token");
      const res = await axios.put(`${URL}/api/admin/profile-pic`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.status === 200) {
        const next = res.data.admin;
        const idStr = next?._id != null ? String(next._id) : admin?.userId;
        setAdmin((prev) => ({
          ...prev,
          ...next,
          userId: idStr ?? prev?.userId,
          id: idStr ?? prev?.id,
          companyName: prev?.companyName,
          staffSince:
            prev?.staffSince ??
            next?.staffSinceAt ??
            next?.createdAt,
        }));
        setProfileImage(next?.profilePic || null);
        setShowUpdateProfilePic(false);
      }
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Could not update photo.");
    } finally {
      setLoading(false);
    }
  };

  const displaySrc = previewUrl || profileImage || defaultProfilePic;

  return (
    <div className="profile-uploader">
      <button
        type="button"
        className="profile-uploader__backdrop"
        aria-label="Close dialog"
        onClick={() => setShowUpdateProfilePic(false)}
      />
      <div
        className="profile-uploader__dialog admin-surface"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-uploader-title"
      >
        <div className="profile-uploader__head">
          <div>
            <h2 id="profile-uploader-title" className="profile-uploader__title">
              Update profile photo
            </h2>
            <p className="profile-uploader__subtitle">
              JPG, PNG or WebP · recommended square · max ~5 MB
            </p>
          </div>
          <button
            type="button"
            className="profile-uploader__close"
            onClick={() => setShowUpdateProfilePic(false)}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form className="profile-uploader__form" onSubmit={handleSubmit}>
          <div className="profile-uploader__preview-wrap">
            <div className="profile-uploader__preview-ring">
              <img src={displaySrc} alt="" className="profile-uploader__preview-img" />
            </div>
          </div>

          <input
            ref={fileInputRef}
            id="profile-photo-input"
            type="file"
            accept="image/*"
            className="profile-uploader__input-hidden"
            onChange={(e) => onPickFile(e.target.files?.[0])}
          />

          <button
            type="button"
            className="profile-uploader__dropzone"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="profile-uploader__dropzone-icon" aria-hidden />
            <span className="profile-uploader__dropzone-title">
              {file ? "Choose a different image" : "Browse or drop an image"}
            </span>
            <span className="profile-uploader__dropzone-hint">
              Opens your file picker — pick a clear photo for your team to recognize you
            </span>
          </button>

          <div className="profile-uploader__actions">
            <button
              type="button"
              className="profile-uploader__btn profile-uploader__btn--ghost"
              onClick={() => setShowUpdateProfilePic(false)}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="profile-uploader__btn profile-uploader__btn--primary"
              disabled={loading || !file}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <span className="profile-uploader__spinner" aria-hidden />
                  Saving…
                </>
              ) : (
                "Save photo"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateProfilePic;
