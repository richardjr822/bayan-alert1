import type { ReactNode } from "react";

type ContainerProps = {
  children: ReactNode;
  size?: "default" | "narrow";
  className?: string;
};

export default function Container({ children, size = "default", className = "" }: ContainerProps) {
  const widthClass = size === "narrow" ? "w-[min(920px,92vw)]" : "w-[min(1200px,92vw)]";
  return <div className={`mx-auto ${widthClass} ${className}`}>{children}</div>;
}
