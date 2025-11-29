import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { UseFormRegister, FieldErrors, UseFieldArrayReturn } from "react-hook-form";
import { FormValues } from "../types";

// LanguagesStep Component
interface LanguagesStepProps {
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  fields: UseFieldArrayReturn<FormValues, "languages">["fields"];
  append: UseFieldArrayReturn<FormValues, "languages">["append"];
  remove: UseFieldArrayReturn<FormValues, "languages">["remove"];
}

export const LanguagesStep: React.FC<LanguagesStepProps> = ({
  register,
  errors,
  fields,
  append,
  remove,
}: LanguagesStepProps) => {
  return (
    <div className="space-y-6">
      {fields.map((field, index) => (
        <Card key={field.id} className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Language {index + 1}</h3>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => remove(index)}
            >
              Remove
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Language</Label>
              <Input {...register(`languages.${index}.language`)} />
              {errors.languages?.[index]?.language && (
                <p className="text-destructive text-sm">
                  {errors.languages[index]?.language?.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Proficiency</Label>
              <Select
                onValueChange={(value) =>
                  register(`languages.${index}.proficiency`).onChange({
                    target: { value },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select proficiency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Basic">Basic</SelectItem>
                  <SelectItem value="Fluent">Fluent</SelectItem>
                  <SelectItem value="Native">Native</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={() => append({ language: "", proficiency: "Basic" })}
      >
        Add Language
      </Button>
    </div>
  );
};
