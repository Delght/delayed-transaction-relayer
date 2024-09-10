import classNames from 'classnames';

export default function Loading({size = 50, className }: { size?: number, className?: string }) {
  return (
    <img
      src="/loading.gif"
      style={{ width: size, height: size }}
      className={classNames(className)}
    />
  );
}
