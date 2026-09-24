// src/components/Pagination.jsx
import Button from "./Button.jsx";

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 mt-6">
      <Button
        variant="secondary"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        ← Précédent
      </Button>
      <span className="text-sm text-gray-600">
        Page <strong>{page}</strong> / {totalPages}
      </span>
      <Button
        variant="secondary"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Suivant →
      </Button>
    </div>
  );
}
