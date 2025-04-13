export default function LoadingDots() {
  return (
    <div className="flex space-x-1 mt-1">
      <div className="animate-bounce w-2 h-2 bg-primary-foreground/50 rounded-full delay-0"></div>
      <div className="animate-bounce w-2 h-2 bg-primary-foreground/50 rounded-full delay-100"></div>
      <div className="animate-bounce w-2 h-2 bg-primary-foreground/50 rounded-full delay-200"></div>
    </div>
  );
}
