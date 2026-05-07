import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { IoChevronBack, IoPersonCircle } from "react-icons/io5";
import { AuthContext } from "../../context/CartContext.jsx";
import { api } from "../../utils/api.js";
import "../signup/SignUp.css";
import "./Profile.css";
import AsyncLoadingOverlay from "../../components/common/AsyncLoadingOverlay.jsx";

function formatMemberSince(iso) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
      new Date(iso),
    );
  } catch {
    return "—";
  }
}

const Profile = () => {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const background = location.state?.background;
  const isModal = Boolean(background);

  const dialogRef = useRef(null);
  const fileInputRef = useRef(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const handleClose = useCallback(() => {
    if (isModal) {
      navigate(-1);
      return;
    }
    navigate("/menu", { replace: true });
  }, [isModal, navigate]);

  useEffect(() => {
    if (location.pathname !== "/profile") return;
    const token = localStorage.getItem("token")?.trim();
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/api/user/me");
        const u = res.data?.user;
        if (cancelled || !u || typeof u !== "object") return;
        const { password: _omit, ...safe } = u;
        setUser(safe);
      } catch {
        /* keep cached user */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, setUser]);

  useEffect(() => {
    if (user) return;
    if (!isModal) {
      navigate("/menu", { replace: true });
    }
  }, [user, isModal, navigate]);

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?._id, user?.profilePic]);

  useEffect(() => {
    if (!isModal) return;
    document.body.classList.add("signup-modal-active");
    return () => {
      document.body.classList.remove("signup-modal-active");
    };
  }, [isModal]);

  useEffect(() => {
    if (!isModal) return;

    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;
    const mobile = window.matchMedia("(max-width: 768px)").matches;

    const prevHtml = {
      overflow: html.style.overflow,
      overscrollBehavior: html.style.overscrollBehavior,
      height: html.style.height,
    };
    const prevBody = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
      overscrollBehavior: body.style.overscrollBehavior,
      touchAction: body.style.touchAction,
    };

    const isInsideDialog = (target) =>
      Boolean(target && dialogRef.current?.contains(target));

    const blockScrollBehind = (e) => {
      if (isInsideDialog(e.target)) return;
      e.preventDefault();
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKeyDown);

    document.addEventListener("touchmove", blockScrollBehind, {
      passive: false,
    });
    document.addEventListener("wheel", blockScrollBehind, { passive: false });

    if (mobile) {
      html.style.overflow = "hidden";
      html.style.overscrollBehavior = "none";
      html.style.height = "100%";

      body.style.position = "fixed";
      body.style.top = `-${scrollY}px`;
      body.style.left = "0";
      body.style.right = "0";
      body.style.width = "100%";
      body.style.overflow = "hidden";
      body.style.overscrollBehavior = "none";
      body.style.touchAction = "none";
    } else {
      html.style.overflow = "hidden";
      html.style.overscrollBehavior = "none";
      body.style.overflow = "hidden";
      body.style.overscrollBehavior = "none";
    }

    return () => {
      document.removeEventListener("touchmove", blockScrollBehind);
      document.removeEventListener("wheel", blockScrollBehind);
      window.removeEventListener("keydown", onKeyDown);

      html.style.overflow = prevHtml.overflow;
      html.style.overscrollBehavior = prevHtml.overscrollBehavior;
      html.style.height = prevHtml.height;

      body.style.position = prevBody.position;
      body.style.top = prevBody.top;
      body.style.left = prevBody.left;
      body.style.right = prevBody.right;
      body.style.width = prevBody.width;
      body.style.overflow = prevBody.overflow;
      body.style.overscrollBehavior = prevBody.overscrollBehavior;
      body.style.touchAction = prevBody.touchAction;

      if (mobile) {
        window.scrollTo(0, scrollY);
      }
    };
  }, [isModal, handleClose]);

  const handleSignOut = () => {
    setUser(null);
    if (isModal) {
      navigate(-1);
    } else {
      navigate("/menu", { replace: true });
    }
  };

  const onPhotoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user?._id) return;
    setPhotoBusy(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await api.put("/api/user/profile-pic", fd);
      const raw = res.data?.user;
      if (raw && typeof raw === "object") {
        const { password: _omit, ...safe } = raw;
        setUser(safe);
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Could not update profile photo.";
      alert(String(msg));
    } finally {
      setPhotoBusy(false);
    }
  };

  if (!user) {
    return null;
  }

  const hasPhoto =
    typeof user.profilePic === "string" &&
    user.profilePic.trim() &&
    !avatarFailed;

  const inner = (
    <div className="signup-card profile-card">
      <h1 id="profile-title" className="profile-title">
        Your profile
      </h1>
      <p className="profile-lead">
        Your account details and photo used across TableTab.
      </p>

      <div className="profile-avatar-block">
        <div className="profile-avatar-ring" aria-hidden>
          {hasPhoto ? (
            <img
              src={user.profilePic.trim()}
              alt=""
              className="profile-avatar-img"
              referrerPolicy="no-referrer"
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <IoPersonCircle className="profile-avatar-fallback" aria-hidden />
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="profile-file-input"
          onChange={onPhotoChange}
          aria-label="Upload profile photo"
        />
        <button
          type="button"
          className="profile-photo-btn"
          disabled={photoBusy}
          onClick={() => fileInputRef.current?.click()}
        >
          {photoBusy ? "Uploading…" : "Change photo"}
        </button>
      </div>

      <dl className="profile-fields">
        <div className="profile-field">
          <dt>Username</dt>
          <dd>{user.username ?? "—"}</dd>
        </div>
        <div className="profile-field">
          <dt>Email</dt>
          <dd>{user.email ?? "—"}</dd>
        </div>
        <div className="profile-field">
          <dt>Account ID</dt>
          <dd className="profile-field__mono">{String(user._id ?? "—")}</dd>
        </div>
        <div className="profile-field">
          <dt>Member since</dt>
          <dd>{formatMemberSince(user.createdAt)}</dd>
        </div>
      </dl>

      <button
        type="button"
        className="profile-signout"
        onClick={handleSignOut}
      >
        Sign out
      </button>

      <div className="signup-backfoot">
        {isModal ? (
          <button
            type="button"
            className="signup-back-icon"
            onClick={handleClose}
            aria-label="Close profile"
          >
            <IoChevronBack className="signup-back-icon__glyph" aria-hidden />
          </button>
        ) : (
          <Link to="/menu" className="signup-back-icon" aria-label="Back to menu">
            <IoChevronBack className="signup-back-icon__glyph" aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );

  if (isModal) {
    return createPortal(
      <div className="signup-modal-root">
        <AsyncLoadingOverlay
          open={photoBusy}
          message="Updating your photo…"
        />
        <button
          type="button"
          className="signup-backdrop"
          aria-label="Close profile"
          onClick={handleClose}
        />
        <div
          ref={dialogRef}
          className="signup-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-title"
        >
          {inner}
        </div>
      </div>,
      document.body,
    );
  }

  return (
    <main className="signup-page profile-page">
      <AsyncLoadingOverlay
        open={photoBusy}
        message="Updating your photo…"
      />
      {inner}
    </main>
  );
};

export default Profile;
