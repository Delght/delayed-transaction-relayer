import classNames from 'classnames';
import React from 'react';
import Loading from '../Loading';

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children?: React.ReactNode;
    htmlFor?: string;
    loading?: boolean;
  }
>((props, ref) => {
  if (props.htmlFor) {
    return (
      <label
        htmlFor={props.htmlFor}
        className={classNames(
          'h-[40px] mt-[20px] bg-[rgba(252,114,255,0.1)] w-full max-w-[500px] rounded-[10px] text-[rgb(252,114,255)] font-bold disabled:cursor-not-allowed opacity-80 cursor-pointer  flex justify-center items-center gap-[10px] text-[14px]',
          props.className
        )}
      >
        {props.loading ? <Loading size={30} /> : props.children}
      </label>
    );
  }

  return (
    <button
      {...props}
      ref={ref}
      disabled={props.disabled || props.loading}
      className={classNames(
        'h-[40px] mt-[20px] bg-[rgba(252,114,255,0.1)] w-full max-w-[500px] rounded-[10px] text-[rgb(252,114,255)] font-bold disabled:cursor-not-allowed opacity-80 flex justify-center items-center gap-[10px] text-[14px]',
        props.className
      )}
    >
      {props.loading && <Loading size={30} />}
      {props.children}
    </button>
  );
});
export default Button;
