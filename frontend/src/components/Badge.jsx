// src/components/Badge.jsx
// Badge de statut color-coded pour events et registrations.
const colors = {
  // event status
  draft:     "bg-gray-100 text-gray-700",
  published: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
  // registration status
  pending:   "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  // role
  admin:     "bg-indigo-100 text-indigo-800",
  staff:     "bg-purple-100 text-purple-800",
};

export default function Badge({ status }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${colors[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}
