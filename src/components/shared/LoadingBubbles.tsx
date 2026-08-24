import classNames from "classnames";

type BubbleSizes = "small" | "medium" | "large";

interface LoadingBubblesProps {
  className?: string;
  size?: BubbleSizes;
  wrapped?: boolean;
}

const sizeMappings = {
  small: ["w-1 h-1", "w-1.5 h-1.5", "w-2 h-2"],
  medium: ["w-1.5 h-1.5", "w-2 h-2", "w-2.5 h-2.5"],
  large: ["w-2 h-2", "w-2.5 h-2.5", "w-3 h-3"],
};

const colorMappings = [
  "bg-twilightPurple-600/60 dark:bg-lavenderHaze-400/60",
  "bg-twilightPurple-600/50 dark:bg-lavenderHaze-400/50",
  "bg-twilightPurple-600/40 dark:bg-lavenderHaze-400/40",
];

export default function LoadingBubbles({
  className,
  size = "medium",
  wrapped = false,
}: LoadingBubblesProps) {
  const bubbles = sizeMappings[size] || sizeMappings.medium;

  const loaderClass = classNames(
    "LoadingBubbles",
    "flex w-full items-center justify-center gap-1",
    className,
  );

  const bubbleLoader = (
    <div className={loaderClass}>
      {bubbles.map((bubbleSize, index) => (
        <div
          key={index}
          className={classNames(
            "animate-bounce animate-duration-700 animate-ease-in animate-infinite -mb-0.5 rounded-full",
            bubbleSize,
            colorMappings[index],
            index === 1 && "animate-delay-100",
            index === 2 && "animate-delay-200",
          )}
        />
      ))}
    </div>
  );

  if (wrapped) {
    return (
      <div className="flex h-dvh items-center justify-center">
        {bubbleLoader}
      </div>
    );
  }

  return bubbleLoader;
}
