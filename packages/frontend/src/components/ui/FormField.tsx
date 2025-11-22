import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import styles from './FormField.module.css';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, helperText, id, className = '', ...inputProps }, ref) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
    const hasError = Boolean(error);

    return (
      <div className={`${styles.formField} ${className}`}>
        <label htmlFor={inputId} className={styles.formField__label}>
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={`${styles.formField__input} ${hasError ? styles['formField__input--error'] : ''}`}
          aria-invalid={hasError}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...inputProps}
        />
        {error && (
          <p id={`${inputId}-error`} className={styles.formField__error} role="alert">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${inputId}-helper`} className={styles.formField__helper}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';
