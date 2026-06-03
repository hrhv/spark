import { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { useAuth, REQUESTED_SCOPES } from "../context/AuthContext";
import { SparkBrand } from "./SparkBrand";

function GoogleColorIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

export function LoginPage() {
  const { setAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const login = useGoogleLogin({
    scope: REQUESTED_SCOPES.join(" "),
    onSuccess: async tokenResponse => {
      setLoading(true);
      setError("");
      try {
        const [userInfo, tokenInfo] = await Promise.all([
          fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          }).then(r => r.json()),
          fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${tokenResponse.access_token}`)
            .then(r => r.json()),
        ]);

        setAuth(
          {
            name:    userInfo.name,
            email:   userInfo.email,
            picture: userInfo.picture,
            hd:      userInfo.hd,
          },
          tokenResponse.access_token,
          (tokenInfo.scope ?? "").split(" ").filter(Boolean),
          tokenResponse.expires_in ?? 3600
        );
      } catch {
        setError("Failed to retrieve your profile. Please try again.");
        setLoading(false);
      }
    },
    onError: () => setError("Sign-in was cancelled or failed. Please try again."),
  });

  return (
    <div className="login-page">
      <div className="login-card">
        <SparkBrand size="lg" />

        <div className="login-divider" />

        <p className="login-desc">
          Sign in with your Google for Work account to send personalized calendar invitations to multiple recipients at once.
        </p>

        <button
          className="btn-google"
          onClick={() => login()}
          disabled={loading}
        >
          <GoogleColorIcon />
          {loading ? "Signing in…" : "Sign in with Google"}
        </button>

        {error && <div className="login-error">{error}</div>}

        <div className="login-permissions">
          <div className="login-permissions-label">Important Note</div>
          <div className="login-permission-item">
            <p>
              This entire app runs in your browser. No data is stored on our servers.<br/><br/>
              <strong>What this means for you:</strong><br/>
              <ul style={{ paddingLeft: "10px", paddingTop: "15px" }}>
                <li style={{ marginBottom: "10px" }}>Your user data, campaigns or templates are stored in your browser and survive browser restarts, updates, device shutdowns, etc.</li>
                <li style={{ marginBottom: "10px" }}>Your data always remains private and secure.</li>
                <li style={{ marginBottom: "10px" }}>There are no cloud syncs or backups. You are responsible for your own data.</li>
                <li style={{ marginBottom: "10px" }}><span style={{ color: "red", fontSize: "11px" }}>If you clear your browser data like cookies, local storage, etc., your data will be lost and cannot be recovered</span>.</li>
              </ul>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
