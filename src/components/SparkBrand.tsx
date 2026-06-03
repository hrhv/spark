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
        style={{ width: isLg ? 80 : 52, height: isLg ? 80 : 52 }}
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
