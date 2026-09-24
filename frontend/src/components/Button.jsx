// src/components/Button.jsx
import { clsx } from "clsx";

const variants = {
  primary:   "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500",
  secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-400",
  danger:    "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  success:   "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  className = "",
  ...props
}) {
  const base  = "inline-flex items-center justify-center gap-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };

  return (
    <button
      disabled={disabled || loading}
      className={clsx(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
