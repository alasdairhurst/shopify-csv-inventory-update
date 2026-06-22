interface Props {
  onClick: () => void;
}

export default function BackButton({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
    >
      <span>←</span>
      <span>Back</span>
    </button>
  );
}
