import type { CSSProperties, ChangeEvent } from "react";
import type { TextComboboxItem } from "./text-combobox-item";
import styles from "./TextCombobox.module.css";

interface TextComboboxProps {
  values: TextComboboxItem[];
  value: TextComboboxItem;
  width?: number;
  onChange: (value: TextComboboxItem) => void;
}

export default function TextCombobox({
  values,
  value,
  width = 100,
  onChange
}: TextComboboxProps) {
  const wrapperStyle: CSSProperties = { width: `${width}px` };

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = values.find((item) => item.id === event.target.value);
    if (next) {
      onChange(next);
    }
  };

  return (
    <div className={styles.textCombobox} style={wrapperStyle}>
      <select
        className={styles.comboBox}
        value={value?.id ?? ""}
        onChange={handleChange}
      >
        {values.map((item) => (
          <option key={item.id} value={item.id}>
            {item.text}
          </option>
        ))}
      </select>
    </div>
  );
}