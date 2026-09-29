export default function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-[var(--color-danger)] bg-red-50 rounded-lg px-3 py-2">{message}</p>;
}
