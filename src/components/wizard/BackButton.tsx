interface Props {
  onClick: () => void;
}

export default function BackButton({ onClick }: Props) {
  return (
    <button onClick={onClick} className="ufc-btn-secondary">
      ← Back
    </button>
  );
}
