import classNames from 'classnames';
import React from 'react';

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    title?: string;
  }
>((props, ref) => {
  return (
    <div className={classNames('w-full max-w-[600px]', props.className)}>
      {props.title && <p className="mb-[10px]">{props.title}</p>}
      <input
        ref={ref}
        {...props}
        className={classNames(
          'outline-none px-[20px] w-full h-[60px] text-[20px] bg-[rgba(0,0,0,0.05)] rounded-[10px]'
        )}
      />
    </div>
  );
});

export default Input;
