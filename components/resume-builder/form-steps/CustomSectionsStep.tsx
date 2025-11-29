import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import { UseFormRegister, FieldErrors, UseFieldArrayReturn } from "react-hook-form";
import { FormValues } from "../types";

interface CustomSectionsStepProps {
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  fields: UseFieldArrayReturn<FormValues, "customSections">["fields"];
  append: UseFieldArrayReturn<FormValues, "customSections">["append"];
  remove: UseFieldArrayReturn<FormValues, "customSections">["remove"];
}

export const CustomSectionsStep = ({
  register,
  errors,
  fields,
  append,
  remove,
}: CustomSectionsStepProps) => {
  return (
    <div className="space-y-6">
      {fields.map((field, index) => (
        <Card key={field.id} className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Custom Section {index + 1}</h3>
            {
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => remove(index)}
              >
                Remove
              </Button>
            }
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Section Title</Label>
              <Input
                {...register(`customSections.${index}.sectionTitle`)}
              />
              {errors.certifications?.[index]?.certificationName && (
                <p className="text-destructive text-sm">
                  {errors.certifications[index]?.certificationName?.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <Input
                {...register(`customSections.${index}.content`)}
              />
              {errors.certifications?.[index]?.issuingOrganization && (
                <p className="text-destructive text-sm">
                  {errors.certifications[index]?.issuingOrganization?.message}
                </p>
              )}
            </div>
          </div>
        </Card>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={() =>
          append({
            sectionTitle: "",
            content: "",
          })
        }
      >
        Add Certification
      </Button>
    </div>
  );
};
