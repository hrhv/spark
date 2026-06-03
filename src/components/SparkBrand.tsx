import sparkLogo from "../assets/spark-logo.svg";

interface SparkBrandProps {
  size?: "sm" | "lg";
}

export function SparkBrand({ size = "sm" }: SparkBrandProps) {
  const isLg = size === "lg";
  return (
    <div className={`spark-brand${isLg ? " spark-brand-lg" : ""}`}>
      <img
        src={sparkLogo}
        alt="Spark logo"
        className="spark-brand-logo"
        style={{ width: isLg ? 52 : 36, height: isLg ? 52 : 36 }}
      />
      <div>
        <div className="spark-brand-name">{isLg ? "Spark" : "Spark"}</div>
        <div className="spark-brand-sub">
          Bulk Calendar Invitations
        </div>
      </div>
    </div>
  );
}
