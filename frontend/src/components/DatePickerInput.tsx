interface DatePickerInputProps {
  type: 'date' | 'month';
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function DatePickerInput({
  type,
  value,
  onChange,
  className = '',
}: DatePickerInputProps) {
  return (
    <div className={`inline-flex items-center ${className}`}>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border rounded h-7 pl-2 pr-2 text-xs bg-background appearance-none cursor-pointer w-[110px]"
        style={{
          colorScheme: 'light',
        }}
      />
    </div>
  );
}
