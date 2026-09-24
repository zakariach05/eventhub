// src/components/Spinner.jsx
export default function Spinner({ className = "" }) {
  return (
    <div className={`flex justify-center items-center py-12 ${className}`}>
      <span className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
