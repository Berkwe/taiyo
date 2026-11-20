import { Checkbox } from "@taiyomoe/ui/components/checkbox"
import { Label } from "@taiyomoe/ui/components/label"
import type { ControllerProps, FieldPath, FieldValues } from "react-hook-form"
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "~/components/ui/form"

export const CheckboxField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  label,
  placeholder,
  className,
  ...props
}: Omit<ControllerProps<TFieldValues, TName>, "render"> & {
  label: string
  placeholder?: string
  className?: string
}) => (
  <FormField
    {...props}
    render={({ field: { onChange, value, ...field } }) => (
      <FormItem className={className}>
        <div className="flex items-center gap-2">
          <FormControl>
            <Checkbox
              {...field}
              aria-label={label}
              checked={Boolean(value)}
              id={field.name}
              onCheckedChange={onChange}
            />
          </FormControl>
          <Label htmlFor={field.name}>{label}</Label>
        </div>
        <FormMessage />
      </FormItem>
    )}
  />
)
