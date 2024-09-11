import classNames from 'classnames';
import React from 'react';

const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    title?: string;
    options: { value: string; label: string }[];
  }
>((props, ref) => {
  return (
    <div className={classNames('w-full max-w-[500px]', props.className)}>
      {props.title && <p className="mb-[10px]">{props.title}</p>}
      <select
        ref={ref}
        {...props}
        className={classNames(
          'outline-none px-[10px] w-full h-[40px] text-[14px] text-base bg-[rgba(0,0,0,0.05)] rounded-[10px] appearance-none'
        )}
      >
        {props.options.map(i => (<option key={i.value} value={i.value}>{i.label}</option>))}
      </select>
    </div>
  );
});

export default Select;
