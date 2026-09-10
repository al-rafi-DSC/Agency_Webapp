import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TextField({ name, label, value = "", type = "text", required = false, maxLength = 240, minLength, prefix = "field" }: {
  name: string; label: string; value?: string; type?: string; required?: boolean; maxLength?: number; minLength?: number; prefix?: string;
}) {
  const id = `${prefix}-${name}`;
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} name={name} type={type} defaultValue={value} required={required} minLength={minLength} maxLength={maxLength} /></div>;
}
